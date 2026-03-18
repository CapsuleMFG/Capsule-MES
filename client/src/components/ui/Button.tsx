interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
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
    case 'ghost':
      variantClasses = 'btn-ghost';
      break;
  }

  return (
    <Component
      className={`${variantClasses} ${className}`}
      {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </Component>
  );
}
