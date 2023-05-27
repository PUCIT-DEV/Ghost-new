import Button, {IButton} from './Button';
import ButtonGroup from './ButtonGroup';
import Heading from './Heading';
import React from 'react';
import {useModal} from '@ebay/nice-modal-react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'bleed';

export interface ModalProps {
    size?: ModalSize;
    title?: string;
    okLabel?: string;
    okColor?: string;
    cancelLabel?: string;
    leftButtonLabel?: string;
    customFooter?: React.ReactNode;
    onOk?: () => void;
    onCancel?: () => void;
    children?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({size = 'md', title, okLabel, cancelLabel, customFooter, leftButtonLabel, onOk, okColor, onCancel, children}) => {
    const modal = useModal();

    let buttons: IButton[] = [];

    if (!customFooter) {
        buttons.push({
            key: 'cancel-modal',
            label: cancelLabel ? cancelLabel : 'Cancel', 
            onClick: (onCancel ? onCancel : () => {
                modal.remove();
            })
        });

        buttons.push({
            key: 'ok-modal',
            label: okLabel ? okLabel : 'OK', 
            color: okColor ? okColor : 'black',
            styles: 'min-w-[80px]',
            onClick: onOk
        });
    }

    let modalStyles = 'relative rounded overflow-hidden z-50 mx-auto flex flex-col justify-between bg-white shadow-xl w-full';
    let backdropStyles = 'fixed inset-0 h-[100vh] w-[100vw] overflow-y-scroll ';

    switch (size) {
    case 'sm':
        modalStyles += ' max-w-[480px] p-8';
        backdropStyles += ' p-[8vmin]';
        break;

    case 'md':
        modalStyles += ' max-w-[720px] p-8';
        backdropStyles += ' p-[8vmin]';
        break;

    case 'lg':
        modalStyles += ' max-w-[1020px] p-12';
        backdropStyles += ' p-[4vmin]';
        break;

    case 'xl':
        modalStyles += ' max-w-[1240px] p-14';
        backdropStyles += ' p-[3vmin]';
        break;

    case 'full':
        modalStyles += ' h-full p-12';
        backdropStyles += ' p-[2vmin]';
        break;

    case 'bleed':
        modalStyles += ' h-full p-12';
        break;
    }

    const handleBackdropClick = () => {
        modal.remove();
    };

    return (
        <div className={backdropStyles} id='modal-backdrop'>
            <div className='fixed inset-0 z-0 bg-[rgba(0,0,0,0.1)]' onClick={handleBackdropClick}></div>
            <section className={modalStyles}>
                <div>
                    {title && <Heading level={4}>{title}</Heading>}
                    <div>{children}</div>
                </div>
                {customFooter ? customFooter : 
                    <div className='w-100 flex items-center justify-between gap-6'>
                        <div>
                            {leftButtonLabel &&
                                <Button label={leftButtonLabel} link={true} />
                            }
                        </div>
                        <div className='flex gap-3'>
                            <ButtonGroup buttons={buttons}/>
                        </div>
                    </div>
                }
            </section>
        </div>
    );
};

export default Modal;