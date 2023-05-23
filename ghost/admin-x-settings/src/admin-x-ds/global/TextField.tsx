import React from 'react';

import Heading from './Heading';
import Hint from './Hint';

type InputFieldType = 'text' | 'number' | 'email' | 'password' | 'checkbox' | 'radio' | 'file' | 'date' | 'time' | 'range' | 'search';

interface ITextField {
    inputRef?: React.RefObject<HTMLInputElement>;
    title?: string;
    type?: InputFieldType;
    value?: string;
    error?: boolean;
    placeholder?: string;
    hint?: React.ReactNode;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const TextField: React.FC<ITextField> = ({
    type = 'text', inputRef, title, value, error, placeholder, hint, onChange, ...props
}) => {
    return (
        <div className='flex flex-col'>
            {title && <Heading useLabelTag={true}>{title}</Heading>}
            <input
                ref={inputRef}
                className={`-mx-1 -mt-0.5 h-10 border-b ${error ? `border-red` : `border-grey-500 hover:border-grey-600 focus:border-grey-900`} px-1 py-2 ${title && `mt-0`}`}
                defaultValue={value}
                placeholder={placeholder}
                type={type}
                onChange={onChange}
                {...props} />
            {hint && <Hint color={error ? 'red' : ''}>{hint}</Hint>}
        </div>
    );
};

export default TextField;