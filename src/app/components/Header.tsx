interface HeaderProps {
    name: string
  }
  
  export default function Header({ name }: HeaderProps) {
    return <h1 className="text-4xl font-bold mb-8 text-gray-800">Welcome, {name}</h1>
  }
  
  