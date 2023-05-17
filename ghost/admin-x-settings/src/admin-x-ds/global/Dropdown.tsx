import React, {useState} from 'react';

import Heading from './Heading';
import Hint from './Hint';

export interface DropdownOption {
    value: string;
    label: string;
}

interface DropdownProps {
    title?: string;
    options: DropdownOption[];
    onSelect: (value: string) => void;
    error?:boolean;
    hint?: React.ReactNode;
}

const Dropdown: React.FC<DropdownProps> = ({title, options, onSelect, error, hint}) => {   
    const [selectedOption, setSelectedOption] = useState('');

    const handleOptionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedValue = event.target.value;
        setSelectedOption(selectedValue);
        onSelect(selectedValue);
    };

    return (
        <div className='flex flex-col'>
            {title && <Heading grey={true} useLabelTag={true}>{title}</Heading>}
            <select className={`-m-1 h-10 border-b ${error ? `border-red` : `border-grey-300 focus:border-grey-900`} py-2 ${title && `mt-0`}`} value={selectedOption} onChange={handleOptionChange}>
                <option value="">Select an option</option>
                {options.map(option => (
                    <option
                        key={option.value}
                        value={option.value}
                    >
                        {option.label}
                    </option>
                ))}
            </select>
            {hint && <Hint color={error ? 'red' : ''}>{hint}</Hint>}
        </div>
    );
};

export default Dropdown;