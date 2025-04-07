interface HeaderProps {
    name: string
  }
  
  export default function Header({ name }: HeaderProps) {
    return (
      <h1 className="text-4xl font-['Playfair_Display'] font-medium mb-8 text-gray-800 tracking-tight">
        <span className="italic">Welcome</span>, {name}
      </h1>
    )
  }
  
  