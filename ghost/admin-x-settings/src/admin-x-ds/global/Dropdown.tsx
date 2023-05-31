import React, {useEffect, useState} from 'react';

import Heading from './Heading';
import Hint from './Hint';

export interface DropdownOption {
    value: string;
    label: string;
}

interface DropdownProps {
    title?: string;
    prompt?: string;
    options: DropdownOption[];
    onSelect: (value: string) => void;
    error?:boolean;
    hint?: React.ReactNode;
    defaultSelectedOption?: string;
    clearBg?: boolean;
}

const Dropdown: React.FC<DropdownProps> = ({title, prompt, options, onSelect, error, hint, defaultSelectedOption, clearBg = false}) => {
    const [selectedOption, setSelectedOption] = useState(defaultSelectedOption);

    useEffect(() => {
        if (defaultSelectedOption) {
            setSelectedOption(defaultSelectedOption);
        }
    }, [defaultSelectedOption]);

    const handleOptionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedValue = event.target.value;
        setSelectedOption(selectedValue);
        onSelect(selectedValue);
    };

    return (
        <div className='flex flex-col'>
            {title && <Heading useLabelTag={true}>{title}</Heading>}
            <div className={`relative w-full after:pointer-events-none after:absolute ${clearBg ? 'after:right-0' : 'after:right-4'} after:block after:h-2 after:w-2 after:rotate-45 after:border-[1px] after:border-l-0 after:border-t-0 after:border-grey-900 after:content-[''] ${title ? 'after:top-[22px]' : 'after:top-[14px]'}`}>
                <select className={`w-full cursor-pointer appearance-none border-b ${!clearBg && 'bg-grey-100 px-[10px]'} py-2 outline-none ${error ? `border-red` : `border-grey-300 hover:border-grey-400 focus:border-grey-600`} ${title && `mt-2`}`} value={selectedOption} onChange={handleOptionChange}>
                    {prompt && <option value="">{prompt}</option>}
                    {options.map(option => (
                        <option
                            key={option.value}
                            value={option.value}
                        >
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>
            {hint && <Hint color={error ? 'red' : ''}>{hint}</Hint>}
        </div>
    );
};

export default Dropdown;