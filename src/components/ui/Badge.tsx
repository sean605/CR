import clsx from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  size?: 'sm' | 'md';
}

export default function Badge({ children, color = 'bg-gray-500', size = 'sm' }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full',
        color.startsWith('bg-') ? `${color}/20` : color,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
      )}
      style={
        color.startsWith('bg-')
          ? undefined
          : { backgroundColor: `${color}20`, color }
      }
    >
      {children}
    </span>
  );
}
