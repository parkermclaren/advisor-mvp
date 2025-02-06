import AIAcademicIcon from "./AIAcademicIcon"

interface WelcomeMessageProps {
  name: string
}

export default function WelcomeMessage({ name }: WelcomeMessageProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      <AIAcademicIcon className="w-12 h-12" />
      <h1 className="text-5xl font-serif font-bold text-deep-blue">Welcome, {name}</h1>
    </div>
  )
}

