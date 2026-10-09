import React from 'react';

export default function AvatarDisplay({
  avatar,
  name,
  color = '#10B981',
  size = 'md',
  className = '',
  ring = true
}) {
  const sizeMap = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl'
  };

  const isPhoto =
    typeof avatar === 'string' &&
    (avatar.startsWith('data:image/') ||
      avatar.startsWith('http://') ||
      avatar.startsWith('https://') ||
      avatar.startsWith('blob:'));

  const chosenSize = sizeMap[size] || sizeMap.md;

  if (isPhoto) {
    return (
      <img
        src={avatar}
        alt={name || 'Operative'}
        className={`${chosenSize} rounded-full object-cover ${
          ring ? 'border-2' : ''
        } shadow-sm flex-shrink-0 ${className}`}
        style={ring ? { borderColor: color } : {}}
      />
    );
  }

  // Fallback to text symbol or name initial
  const displayText = avatar || (name ? name.trim().charAt(0).toUpperCase() : '⚡');

  return (
    <div
      className={`${chosenSize} rounded-full flex items-center justify-center font-bold text-white ${
        ring ? 'border-2 border-white/80' : ''
      } shadow-sm flex-shrink-0 ${className}`}
      style={{ backgroundColor: color }}
    >
      <span className="leading-none">{displayText}</span>
    </div>
  );
}
