import React, {useEffect, useId, useState} from 'react';

import Heading from './Heading';
import Hint from './Hint';
import clsx from 'clsx';

export interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps {
    title?: string;
    prompt?: string;
    options: SelectOption[];
    onSelect: (value: string) => void;
    error?:boolean;
    hint?: React.ReactNode;
    defaultSelectedOption?: string;
    clearBg?: boolean;
    containerClassName?: string;
    selectClassName?: string;
    optionClassName?: string;
    unstyled?: boolean;
}

const Select: React.FC<SelectProps> = ({
    title,
    prompt,
    options,
    onSelect,
    error,
    hint,
    defaultSelectedOption,
    clearBg = false,
    containerClassName,
    selectClassName,
    optionClassName,
    unstyled
}) => {
    const id = useId();

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

    let containerClasses = '';
    if (!unstyled) {
        containerClasses = clsx(
            'relative w-full after:pointer-events-none',
            `after:absolute after:block after:h-2 after:w-2 after:rotate-45 after:border-[1px] after:border-l-0 after:border-t-0 after:border-grey-900 after:content-['']`,
            title ? 'after:top-[22px]' : 'after:top-[14px]',
            clearBg ? 'after:right-0' : 'after:right-4'
        );
    }
    containerClasses = clsx(
        containerClasses,
        containerClassName
    );

    let selectClasses = '';
    if (!unstyled) {
        selectClasses = clsx(
            'w-full cursor-pointer appearance-none border-b py-2 outline-none',
            !clearBg && 'bg-grey-75 px-[10px]',
            error ? 'border-red' : 'border-grey-500 hover:border-grey-700 focus:border-black',
            title && 'mt-2'
        );
    }
    selectClasses = clsx(
        selectClasses,
        selectClassName
    );

    const optionClasses = optionClassName;

    return (
        <div className='flex w-full flex-col'>
            {title && <Heading htmlFor={id} useLabelTag={true}>{title}</Heading>}
            <div className={containerClasses}>
                <select className={selectClasses} id={id} value={selectedOption} onChange={handleOptionChange}>
                    {prompt && <option className={optionClasses} value="">{prompt}</option>}
                    {options.map(option => (
                        <option
                            key={option.value}
                            className={optionClasses}
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

export default Select;
