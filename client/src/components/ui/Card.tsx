interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export default function Card({ children, className = '', hover = false, onClick }: CardProps) {
  return (
    <div
      className={`
        card p-4
        ${hover ? 'card-hover' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
