import React from 'react';
import {Icon, Toggle} from '@tryghost/admin-x-design-system';
import {withErrorBoundary} from '@tryghost/admin-x-design-system';

const getFriendlyTypeName = (type: 'url' | 'short' | 'long' | 'boolean') => {
    switch (type) {
    case 'long':
        return 'Long Text';
    case 'short':
        return 'Short Text';
    case 'url':
        return 'Link';
    case 'boolean':
        return 'Checkbox';
    default:
        break;
    }
};

const getIconComponent = (type: 'url' | 'short' | 'long' | 'boolean', icon?: URL|null) => {
    if (!icon || !icon?.href) {
        switch (type) {
        case 'long':
            return <p className='black font-semibold'>Aa</p>;
        case 'short':
            return <Icon colorClass='text-black' name='long-text' size='sm' />;
        case 'url':
            return <Icon colorClass='text-black' name='hyperlink-circle' size='sm' />;
        case 'boolean':
            return <Icon colorClass='text-black' name='long-text' size='sm' />;
        default:
            break;
        }
    } else {
        return <img src={icon.href} />;
    }
};

const CustomFieldToggle: React.FC<{
    id?: string | undefined,
    icon?: URL | null,
    name: string,
    type: 'url' | 'short' | 'long' | 'boolean',
    placeholder?: string | null,
    enabled: boolean,
    toggleDisabled?: boolean,
    isFirst?: boolean,
    handleChange?: (field: {id: string, enabled: boolean}) => void
}> = ({
    id,
    icon,
    name,
    type,
    enabled = false,
    toggleDisabled = false,
    isFirst = false,
    handleChange
}) => {
    let iconComponent = getIconComponent(type, icon);
    let typeNameFriendly = getFriendlyTypeName(type);

    return (
        <div className={`flex items-center justify-between border border-x-transparent border-b-grey-250 py-2 ${isFirst ? 'border-t-grey-250' : ' border-t-transparent'}`}>
            <div className='flex'>
                <div className='mr-2 flex h-11 w-11 items-center justify-center rounded bg-grey-150'>
                    {iconComponent}
                </div>
                <div className='flex flex-col'>
                    <strong>{name}</strong>
                    <p>{typeNameFriendly}</p>
                </div>
            </div>
            <div>
                <Toggle
                    checked={enabled}
                    disabled={toggleDisabled}
                    onChange={(e) => {
                        if (!id) {
                            return;
                        }
                        handleChange?.({id, enabled: e.target.checked});
                    }}
                />
            </div>
        </div>
    );
};

export default withErrorBoundary(CustomFieldToggle, 'Custom Field Toggle');
