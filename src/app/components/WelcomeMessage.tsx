import AIAcademicIcon from "./AIAcademicIcon"

interface WelcomeMessageProps {
  name: string
}

export default function WelcomeMessage({ name }: WelcomeMessageProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      <AIAcademicIcon className="w-12 h-12" />
      <h1 className="text-5xl font-['Playfair_Display'] font-medium text-deep-blue tracking-tight">
        <span className="italic">Welcome</span>, {name}
      </h1>
    </div>
  )
}

