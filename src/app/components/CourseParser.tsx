"use client"

import { createClient } from '@supabase/supabase-js';
import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface CourseInfo {
  code: string;
  title: string;
  description: string | null;
  credits: number | null;
  sections: {
    section_code: string;
    instructor: string;
    day_pattern: string;
    start_time: string;
    end_time: string;
    location: string;
    term: string;
  }[] | null;
}

interface CourseParserProps {
  content: string;
  isSidebarOpen?: boolean;
}

export default function CourseParser({ content, isSidebarOpen = true }: CourseParserProps) {
  const [activeCard, setActiveCard] = useState<CourseInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Effect to add course info to DOM and clean up when unmounted
  useEffect(() => {
    // Remove course info when component unmounts
    return () => {
      const existingElement = document.getElementById('course-info-extension');
      if (existingElement) {
        existingElement.remove();
      }
    };
  }, []);

  // Effect to update course info when activeCard changes
  useEffect(() => {
    // First, remove any existing course info
    const existingElement = document.getElementById('course-info-extension');
    if (existingElement) {
      existingElement.remove();
    }

    // If there's an active card, add it above the input box
    if (activeCard) {
      // Create element to hold the course info
      const courseInfoElement = document.createElement('div');
      courseInfoElement.id = 'course-info-extension';
      
      // Position based on sidebar state - with transition for smooth animation
      courseInfoElement.className = 'fixed bottom-[calc(96px+8rem)] right-4 px-4 z-[100] transition-all duration-300';
      courseInfoElement.style.left = isSidebarOpen ? 'calc(256px + 1rem)' : '1rem';
      
      // Create the content
      const content = document.createElement('div');
      content.className = 'max-w-5xl mx-auto bg-deep-blue/80 backdrop-blur-xl border border-deep-blue/40 rounded-2xl p-6 shadow-[0_8px_32px_0_rgba(0,36,88,0.2)] backdrop-saturate-[1.3] text-white';
      
      // Render the course info
      // We'll use ReactDOM to render React components into the DOM
      const root = document.createElement('div');
      root.className = 'course-info-root';
      content.appendChild(root);
      courseInfoElement.appendChild(content);
      
      // Add to DOM
      document.body.appendChild(courseInfoElement);
      
      // Use ReactDOM to render the CourseCard
      const ReactDOM = require('react-dom/client');
      const reactRoot = ReactDOM.createRoot(root);
      reactRoot.render(
        <CourseInfoCard 
          course={activeCard} 
          onClose={() => setActiveCard(null)} 
        />
      );
    }
  }, [activeCard, isSidebarOpen]);
  
  // Fetch course data when a course is clicked
  const fetchCourseData = async (e: React.MouseEvent, courseCode: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsLoading(true);
    
    try {
      // Fetch course data
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('code', courseCode)
        .single();
      
      if (courseError) throw courseError;
      
      // Fetch course sections
      const { data: sections, error: sectionsError } = await supabase
        .from('course_sections')
        .select('*')
        .eq('course_code', courseCode);
      
      if (sectionsError) throw sectionsError;
      
      setActiveCard({
        code: course.code,
        title: course.title,
        description: course.description,
        credits: course.credits,
        sections: sections
      });
    } catch (error) {
      console.error('Error fetching course data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Course info card component
  const CourseInfoCard = ({ course, onClose }: { course: CourseInfo, onClose: () => void }) => {
    const [activeSectionIndex, setActiveSectionIndex] = useState(0);
    const totalSections = course.sections?.length || 0;
    const sectionsRef = React.useRef<HTMLDivElement>(null);

    const scrollToSection = (index: number) => {
      if (!sectionsRef.current) return;
      
      if (index >= 0 && index < totalSections) {
        setActiveSectionIndex(index);
        const container = sectionsRef.current;
        const sectionElements = container.querySelectorAll('.section-card');
        if (sectionElements[index]) {
          sectionElements[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }
    };

    // Touch handlers for swiping
    const touchStartX = React.useRef<number | null>(null);
    
    const handleTouchStart = (e: React.TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
    };
    
    const handleTouchEnd = (e: React.TouchEvent) => {
      if (touchStartX.current === null) return;
      
      const touchEndX = e.changedTouches[0].clientX;
      const diff = touchStartX.current - touchEndX;
      
      if (Math.abs(diff) > 50) {
        if (diff > 0 && activeSectionIndex < totalSections - 1) {
          scrollToSection(activeSectionIndex + 1);
        } else if (diff < 0 && activeSectionIndex > 0) {
          scrollToSection(activeSectionIndex - 1);
        }
      }
      
      touchStartX.current = null;
    };

    // Handle scroll events to update active section
    const handleScroll = () => {
      if (!sectionsRef.current) return;
      
      const container = sectionsRef.current;
      const sectionElements = container.querySelectorAll('.section-card');
      const containerLeft = container.getBoundingClientRect().left;
      
      let closestSection = 0;
      let closestDistance = Number.MAX_VALUE;
      
      sectionElements.forEach((section, index) => {
        const rect = section.getBoundingClientRect();
        const distance = Math.abs(rect.left - containerLeft);
        
        if (distance < closestDistance) {
          closestDistance = distance;
          closestSection = index;
        }
      });
      
      if (closestSection !== activeSectionIndex) {
        setActiveSectionIndex(closestSection);
      }
    };
    
    return (
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium text-white">
              {course.code}: {course.title}
              </h3>
            <span className="bg-deep-blue/50 px-2 py-0.5 text-sm text-white/90 rounded-xl border border-white/20">
              {course.credits} credits
              </span>
          </div>
          <button 
            className="p-1.5 text-white hover:text-white/80 transition-colors bg-deep-blue/50 hover:bg-deep-blue/70 backdrop-blur-xl rounded-xl"
            onClick={onClose}
          >
            ✕
          </button>
            </div>
            
        {course.description && (
              <div>
            <h4 className="text-base font-medium mb-0.5 text-white">Description</h4>
            <p className="text-white/90 line-clamp-2 text-sm">{course.description}</p>
              </div>
            )}
            
        {course.sections && course.sections.length > 0 && (
              <div>
            <div className="flex justify-between items-center mb-0.5">
              <h4 className="text-sm font-medium text-white">Available Sections</h4>
              <div className="text-xs text-white/80">
                {activeSectionIndex + 1} of {totalSections}
              </div>
            </div>

            <div 
              className="relative overflow-hidden"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div 
                ref={sectionsRef}
                className="flex space-x-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
                onScroll={handleScroll}
              >
                {course.sections.map((section, i) => (
                  <div 
                    key={i} 
                    className={`section-card flex-shrink-0 bg-white/20 rounded-xl p-2 border border-white/30 
                              min-w-[calc(45%-0.5rem)] max-w-[calc(45%-0.5rem)] snap-center
                              ${i === activeSectionIndex ? 'border-white/50 bg-white/30' : ''}`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-white text-sm">Section {section.section_code}</span>
                      <span className="text-white/80 text-xs">{section.term}</span>
                      </div>
                    <div className="mt-0.5 text-xs space-y-0.5 text-white/90">
                        <div>Instructor: {section.instructor}</div>
                        <div>Schedule: {section.day_pattern} {section.start_time.substring(0, 5)} - {section.end_time.substring(0, 5)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
          </div>
        )}
      </div>
    );
  };

  // Custom components for ReactMarkdown
  const components = {
    // Process text in paragraphs to find course codes
    p: ({ children, ...props }: any) => {
      if (typeof children === 'string') {
        return <p {...props}>{processText(children)}</p>;
      }
      // Handle array of children
      if (Array.isArray(children)) {
        return <p {...props}>{children.map((child, i) => 
          typeof child === 'string' ? <React.Fragment key={i}>{processText(child)}</React.Fragment> : child
        )}</p>;
      }
      return <p {...props}>{children}</p>;
    },
    // Process text in list items to find course codes
    li: ({ children, ...props }: any) => {
      if (typeof children === 'string') {
        return <li {...props}>{processText(children)}</li>;
      }
      // Handle array of children
      if (Array.isArray(children)) {
        return <li {...props}>{children.map((child, i) => 
          typeof child === 'string' ? <React.Fragment key={i}>{processText(child)}</React.Fragment> : child
        )}</li>;
      }
      return <li {...props}>{children}</li>;
    },
    // Handle strong text (bold)
    strong: ({ children, ...props }: any) => {
      if (typeof children === 'string') {
        return <strong {...props}>{processText(children)}</strong>;
      }
      return <strong {...props}>{children}</strong>;
    },
    // Handle emphasized text (italics)
    em: ({ children, ...props }: any) => {
      if (typeof children === 'string') {
        return <em {...props}>{processText(children)}</em>;
      }
      return <em {...props}>{children}</em>;
    },
    // Handle any other inline text
    span: ({ children, ...props }: any) => {
      if (typeof children === 'string') {
        return <span {...props}>{processText(children)}</span>;
      }
      return <span {...props}>{children}</span>;
    }
  };

  // Process text to find and replace course codes with buttons
  const processText = (text: string) => {
    if (!text) return text;
    
    const parts = [];
    let lastIndex = 0;
    
    // Updated regex to handle more variations of course code references
    // Also capture credits when available
    const regex = /\b([A-Z]{2,4})(\d{3})(?::|\.|\s+)(?:\s*)([^,.();:\n]*(?:[,.][^,.();:\n]*)*)(?: \((\d) credits?\))?/g;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      const [fullMatch, dept, num, title, credits] = match;
      const courseCode = `${dept}${num}`;
      
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      // Add the interactive course button - clean up any asterisks or extra formatting
      const cleanTitle = title.trim().replace(/\*/g, '');
      const displayCredits = credits ? `(${credits} credits)` : '';
      
      parts.push(
        <button 
          key={`course-${match.index}`}
          className="course-btn inline-flex items-center px-3 py-1.5 bg-white/20 hover:bg-white/30 text-blue-900 hover:text-blue-900/90 rounded-lg text-base border border-white/30 hover:border-white/50 transition-colors mx-1 whitespace-nowrap no-underline"
          onClick={(e) => fetchCourseData(e, courseCode)}
          style={{ color: 'var(--deep-blue, #1a365d)', textDecoration: 'none' }}
        >
          <span className="font-medium">{dept}{num}:</span> {cleanTitle} <span className="opacity-75 ml-1">{displayCredits}</span>
        </button>
      );
      
      lastIndex = match.index + fullMatch.length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return parts.length > 1 ? parts : text;
  };
  
  return (
    <div className="prose prose-gray prose-p:my-2">
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
      
      {isLoading && (
        <div 
          className="fixed z-[100] right-4 bottom-[calc(96px+8rem)] px-4 transition-all duration-300"
          style={{ left: isSidebarOpen ? 'calc(256px + 1rem)' : '1rem' }}
        >
          <div className="max-w-5xl mx-auto bg-deep-blue/80 backdrop-blur-xl border border-deep-blue/40 
                        rounded-xl p-3 shadow-[0_8px_32px_0_rgba(0,36,88,0.2)]
                        animate-in fade-in slide-in-from-bottom-2 duration-200
                        backdrop-saturate-[1.3] text-white">
          Loading course data...
          </div>
        </div>
      )}
    </div>
  );
} 