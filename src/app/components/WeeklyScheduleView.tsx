import { useRef, useState } from 'react';

interface CourseSection {
  section_id: string;
  course_code: string;
  course_title: string;
  day_pattern: string;
  start_time: string;
  end_time: string;
  credits: number;
  instructor: string;
  location: string;
}

interface TimeSlot {
  label: string;
  time: string;
  minutes: number;
  isHour: boolean;
}

type GridCell = (CourseSection & { duration: number }) | null;

interface WeeklyScheduleViewProps {
  sections: CourseSection[];
}

// Map of day patterns to their indices
const dayMap: { [key: string]: number } = {
  'M': 0, 'T': 1, 'W': 2, 'R': 3, 'F': 4
};

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  // Convert afternoon times (1-7) to 24-hour format (13-19)
  const adjustedHours = (hours < 8 && hours > 0) ? hours + 12 : hours;
  return adjustedHours * 60 + minutes;
};

const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
  return `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
};

const formatTimeLabel = (hour: number): string => {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
  return `${displayHour}:00 ${ampm}`;
};

const MINUTES_PER_HOUR = 60;
const PIXELS_PER_MINUTE = 0.8; // Made even more compact

export default function WeeklyScheduleView({ sections }: WeeklyScheduleViewProps) {
  const [hoveredCourse, setHoveredCourse] = useState<CourseSection | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number; placement: 'right' | 'left' | 'bottom' | 'top' } | null>(null);
  const scheduleContainerRef = useRef<HTMLDivElement>(null);

  // Find earliest and latest times
  const earliestTime = sections.reduce((earliest, section) => 
    section.start_time < earliest ? section.start_time : earliest, "23:59"
  );
  const latestTime = sections.reduce((latest, section) => 
    section.end_time > latest ? section.end_time : latest, "00:00"
  );

  // Round to nearest hour for display, but keep minute precision for courses
  const startHour = Math.floor(timeToMinutes(earliestTime) / 60);
  const endHour = Math.min(Math.ceil(timeToMinutes(latestTime) / 60) + 1, 16); // Cap at 4 PM

  // Generate hour markers
  const hourMarkers = Array.from(
    { length: endHour - startHour + 1 },
    (_, i) => startHour + i
  );

  // Group courses by day
  const coursesByDay = days.map((_, dayIndex) => {
    const dayKey = Object.keys(dayMap).find(k => dayMap[k] === dayIndex);
    if (!dayKey) return [];
    
    return sections.filter(section => section.day_pattern.includes(dayKey));
  });

  const totalMinutes = (endHour - startHour) * MINUTES_PER_HOUR;
  const scheduleHeight = totalMinutes * PIXELS_PER_MINUTE;

  const handleMouseEnter = (event: React.MouseEvent<HTMLDivElement>, course: CourseSection) => {
    if (!scheduleContainerRef.current) return;

    const cardRect = event.currentTarget.getBoundingClientRect();
    const containerRect = scheduleContainerRef.current.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Check if showing tooltip to the right would extend beyond window
    const tooltipWidth = 256; // w-64 = 16rem = 256px
    const tooltipHeight = 200; // Increased height estimate for safety
    
    // Check all edges
    const wouldExtendBeyondRight = (cardRect.right + tooltipWidth + 12) > windowWidth;
    const wouldExtendBeyondBottom = (cardRect.bottom + tooltipHeight) > windowHeight;
    
    let top, left;
    let placement: 'right' | 'left' | 'bottom' | 'top' = 'right';
    
    // If would extend beyond bottom, always position above the card
    if (wouldExtendBeyondBottom) {
      top = cardRect.top - containerRect.top + window.scrollY - tooltipHeight - 12;
      placement = 'top';
      
      // Horizontal positioning when above
      if (wouldExtendBeyondRight) {
        left = Math.max(0, cardRect.left - containerRect.left + window.scrollX);
      } else {
        left = cardRect.left - containerRect.left + window.scrollX;
      }
    } 
    // Not extending beyond bottom, use horizontal placement
    else if (wouldExtendBeyondRight) {
      // Position to the left of the card
      left = cardRect.left - containerRect.left + window.scrollX - tooltipWidth - 12;
      top = cardRect.top - containerRect.top + window.scrollY;
      placement = 'left';
      
      // If that would go off left edge, position below card instead
      if (left < 0) {
        left = cardRect.left - containerRect.left + window.scrollX;
        top = cardRect.bottom - containerRect.top + window.scrollY + 12;
        placement = 'bottom';
      }
    } 
    // Default: position to the right
    else {
      left = cardRect.right - containerRect.left + window.scrollX + 12;
      top = cardRect.top - containerRect.top + window.scrollY;
      placement = 'right';
    }
    
    setHoveredCourse(course);
    setTooltipPosition({ top, left, placement });
  };

  const handleMouseLeave = () => {
    setHoveredCourse(null);
    setTooltipPosition(null);
  };

  return (
    <div className="overflow-x-auto">
      <div ref={scheduleContainerRef} className="min-w-[800px] relative"> {/* Added relative positioning */}
        <table className="w-full table-fixed border-collapse bg-white/10 backdrop-blur-xl rounded-xl overflow-hidden border border-white/20">
        <thead>
          <tr>
              <th className="w-24 p-3 bg-deep-blue/80 backdrop-blur-xl text-white font-medium text-center border-b border-white/20">
                Time
              </th>
              {days.map(day => (
                <th key={day} className="w-[calc((100%-6rem)/5)] p-3 bg-deep-blue/80 backdrop-blur-xl text-white font-medium text-center border-b border-white/20">
                  {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
            <tr>
              <td className="align-top w-24">
                <div style={{ height: `${scheduleHeight}px` }} className="relative">
                  {hourMarkers.map(hour => (
                    <div
                      key={hour}
                      style={{
                        top: `${(hour - startHour) * MINUTES_PER_HOUR * PIXELS_PER_MINUTE}px`
                      }}
                      className="absolute left-0 right-0 flex items-center"
                    >
                      <div className="px-3 text-right w-full">
                        <div className="text-sm font-medium text-deep-blue">
                          {formatTimeLabel(hour)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </td>
              {coursesByDay.map((dayCourses, dayIndex) => (
                <td key={dayIndex} className="relative p-0 w-[calc((100%-6rem)/5)] border-l border-white/10"> {/* Added subtle vertical borders */}
                  <div style={{ height: `${scheduleHeight}px` }} className="relative">
                    {/* Hour marker lines */}
                    {hourMarkers.map(hour => (
                      <div
                        key={hour}
                        style={{
                          top: `${(hour - startHour) * MINUTES_PER_HOUR * PIXELS_PER_MINUTE}px`
                        }}
                        className="absolute inset-x-0 border-t border-white/20"
                      />
                    ))}
                    
                    {/* Course blocks */}
                    {dayCourses.map(course => {
                      const startMinutes = timeToMinutes(course.start_time) - startHour * MINUTES_PER_HOUR;
                      const endMinutes = timeToMinutes(course.end_time) - startHour * MINUTES_PER_HOUR;
                      const duration = endMinutes - startMinutes;

                  return (
                        <div
                          key={`${course.section_id}-${course.start_time}`}
                          onMouseEnter={(e) => handleMouseEnter(e, course)}
                          onMouseLeave={handleMouseLeave}
                          style={{
                            top: `${startMinutes * PIXELS_PER_MINUTE}px`,
                            height: `${duration * PIXELS_PER_MINUTE}px`
                          }}
                          className="absolute inset-x-1 bg-deep-blue/80 backdrop-blur-xl border border-deep-blue/20 hover:bg-deep-blue/90 transition-colors rounded shadow-[0_8px_32px_0_rgba(26,54,93,0.15)] backdrop-saturate-[1.3] cursor-pointer" // Added cursor-pointer
                        >
                          <div className="absolute inset-0.5 rounded bg-white/5 hover:bg-white/10 transition-colors">
                            <div className="p-2 overflow-hidden h-full flex items-center justify-center">
                              <div className="font-medium text-base text-white">
                                {course.course_code}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                      </div>
                    </td>
              ))}
            </tr>
        </tbody>
      </table>

      {/* Conditionally Rendered Tooltip (Outside Table) */}
      {hoveredCourse && tooltipPosition && (
        <div
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
          }}
          className={`absolute z-[100] w-64 pointer-events-none animate-in fade-in duration-150 
            ${tooltipPosition.placement === 'right' ? 'slide-in-from-left-4' : 
             tooltipPosition.placement === 'left' ? 'slide-in-from-right-4' : 
             tooltipPosition.placement === 'top' ? 'slide-in-from-bottom-4' :
             'slide-in-from-top-4'}`}
        >
          <div className="bg-white backdrop-blur-xl border border-white/50 rounded shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] p-3 text-left">
            <div className="font-medium text-base text-deep-blue">
              {hoveredCourse.course_code}
            </div>
            <div className="text-sm font-medium text-gray-800 mt-1">
              {hoveredCourse.course_title}
            </div>
            <div className="text-xs text-gray-700 mt-2">
              {formatTime(hoveredCourse.start_time)} - {formatTime(hoveredCourse.end_time)}
            </div>
            <div className="text-xs text-gray-600 mt-0.5">
              Instructor: {hoveredCourse.instructor}
            </div>
            {hoveredCourse.location && (
              <div className="text-xs text-gray-600 mt-0.5">
                Location: {hoveredCourse.location}
              </div>
            )}
            <div className="text-xs text-gray-600 mt-0.5">
              {hoveredCourse.credits} credit{hoveredCourse.credits !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
} 