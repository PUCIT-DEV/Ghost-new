import Icon from './Icon';
import React from 'react';

export type ButtonColor = 'clear' | 'grey' | 'black' | 'green' | 'red' | 'white';
export type ButtonSize = 'sm' | 'md';

export interface IButton {
    size?: ButtonSize;
    label?: string;
    icon?: string;
    key?: string;
    color?: string;
    fullWidth?: boolean;
    link?: boolean;
    disabled?: boolean;
    className?: string;
    onClick?: () => void;
}

const Button: React.FC<IButton> = ({
    size = 'md',
    label = '',
    icon = '',
    color = 'clear',
    fullWidth,
    link,
    disabled,
    onClick,
    className = '',
    ...props
}) => {
    if (!color) {
        color = 'clear';
    }

    let styles = '';

    styles += ' transition whitespace-nowrap flex items-center justify-center rounded-sm text-sm';
    styles += ((link && color !== 'clear' && color !== 'black') || (!link && color !== 'clear')) ? ' font-bold' : ' font-semibold';
    styles += !link ? `${size === 'sm' ? ' px-3 h-7 ' : ' px-4 h-9 '}` : '';

    switch (color) {
    case 'black':
        styles += link ? ' text-black hover:text-grey-800' : ' bg-black text-white hover:bg-grey-900';
        break;
    case 'grey':
        styles += link ? ' text-black hover:text-grey-800' : ' bg-grey-100 text-black hover:!bg-grey-300';
        break;
    case 'green':
        styles += link ? ' text-green hover:text-green-400' : ' bg-green text-white hover:bg-green-400';
        break;
    case 'red':
        styles += link ? ' text-red hover:text-red-400' : ' bg-red text-white hover:bg-red-400';
        break;
    case 'white':
        styles += link ? ' text-white hover:text-white' : ' bg-white text-black';
        break;
    default:
        styles += link ? ' text-black hover:text-grey-800' : ' bg-transparent text-black hover:text-grey-800';
        break;
    }

    styles += (fullWidth && !link) ? ' w-full' : '';
    styles += (disabled) ? ' opacity-40' : ' cursor-pointer';
    styles += ` ${className}`;

    return (
        <button
            className={styles}
            disabled={disabled}
            type="button"
            onClick={onClick}
            {...props}
        >
            {icon && <Icon color={(color === 'clear' || color === 'grey' || color === 'white' ? 'black' : 'white')} name={icon} size={size === 'sm' ? 'sm' : 'md'} />}
            {label}
        </button>
    );
};

export default Button;