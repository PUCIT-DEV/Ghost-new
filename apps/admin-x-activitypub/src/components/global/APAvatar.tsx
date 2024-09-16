import React from 'react';
import {ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Icon} from '@tryghost/admin-x-design-system';

type AvatarSize = 'xs' | 'sm' | 'lg';
export type AvatarBadge = 'user-fill' | 'heart-fill' | 'comment-fill' | undefined;

interface APAvatarProps {
    author?: ActorProperties;
    size?: AvatarSize;
    badge?: AvatarBadge;
}

const APAvatar: React.FC<APAvatarProps> = ({author, size, badge}) => {
    let iconSize = 18;
    let containerClass = '';
    let imageClass = 'z-10 rounded w-10 h-10';
    const badgeClass = `w-6 h-6 rounded-full absolute -bottom-2 -right-2 border-2 border-white content-box flex items-center justify-center `;
    let badgeColor = '';

    switch (badge) {
    case 'user-fill':
        badgeColor = ' bg-blue-500';
        break;
    case 'heart-fill':
        badgeColor = ' bg-red-500';
        break;
    case 'comment-fill':
        badgeColor = ' bg-purple-500';
        break;
    }
    
    switch (size) {
    case 'xs':
        iconSize = 12;
        containerClass = 'z-10 rounded bg-grey-100 flex items-center justify-center p-[3px] w-6 h-6';
        imageClass = 'z-10 rounded w-6 h-6';
        break;
    case 'sm':
        containerClass = 'z-10 rounded bg-grey-100 flex items-center justify-center p-[10px] w-10 h-10';
        break;
    case 'lg':
        containerClass = 'z-10 rounded bg-grey-100 flex items-center justify-center p-[10px] w-22 h-22';
        break;
    default:
        containerClass = 'z-10 rounded bg-grey-100 flex items-center justify-center p-[10px] w-10 h-10';
        break;
    }

    return (
        <>
            {author && author.icon?.url ? (
                <a className='relative z-10 h-10 w-10 pt-[3px] transition-opacity hover:opacity-80' href={author.url} rel='noopener noreferrer' target='_blank'>
                    <img 
                        className={imageClass} 
                        src={author.icon.url}
                    />
                    {badge && (
                        <div className={`${badgeClass} ${badgeColor}`}>
                            <Icon
                                colorClass='text-white'
                                name={badge} 
                                size='xs'
                            />
                        </div>
                    )}
                </a>
            ) : (
                <div className={containerClass}>
                    <Icon 
                        colorClass='text-grey-600' 
                        name='user' 
                        size={iconSize} 
                    />
                </div>
            )}
        </>
    );
};

export default APAvatar;
