interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  as?: 'button' | 'span';
  children: React.ReactNode;
  className?: string;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  as: Component = 'button',
  children,
  className = '',
  ...props
}: ButtonProps) {
  let variantClasses = '';

  switch (variant) {
    case 'primary':
      variantClasses = 'btn-primary';
      break;
    case 'secondary':
      variantClasses = 'btn-secondary';
      break;
    case 'danger':
      variantClasses = 'btn-danger';
      break;
  }

  return (
    <Component
      className={`${variantClasses} ${className}`}
      {...(props as any)}
    >
      {children}
    </Component>
  );
}
