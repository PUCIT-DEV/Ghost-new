import {useState, useContext, useRef, useEffect, useCallback} from 'react';
import Frame from './Frame';
import MemberGravatar from './common/MemberGravatar';
import AppContext from '../AppContext';
import {ReactComponent as UserIcon} from '../images/icons/user.svg';
import {ReactComponent as ButtonIcon1} from '../images/icons/button-icon-1.svg';
import {ReactComponent as ButtonIcon2} from '../images/icons/button-icon-2.svg';
import {ReactComponent as ButtonIcon3} from '../images/icons/button-icon-3.svg';
import {ReactComponent as ButtonIcon4} from '../images/icons/button-icon-4.svg';
import {ReactComponent as ButtonIcon5} from '../images/icons/button-icon-5.svg';
import TriggerButtonStyle from './TriggerButton.styles';
import {isInviteOnlySite, isSigninAllowed} from '../utils/helpers';
import {hasMode} from '../utils/check-mode';

const ICON_MAPPING = {
    'icon-1': ButtonIcon1,
    'icon-2': ButtonIcon2,
    'icon-3': ButtonIcon3,
    'icon-4': ButtonIcon4,
    'icon-5': ButtonIcon5
};

const Styles = ({hasText}) => {
    const frame = {
        ...(!hasText ? {width: '105px'} : {}),
        ...(hasMode(['preview']) ? {opacity: 1} : {})
    };
    return {
        frame: {
            zIndex: '3999998',
            position: 'fixed',
            bottom: '0',
            right: '0',
            width: '500px',
            maxWidth: '500px',
            height: '98px',
            animation: '250ms ease 0s 1 normal none running animation-bhegco',
            transition: 'opacity 0.3s ease 0s',
            overflow: 'hidden',
            ...frame
        },
        userIcon: {
            width: '34px',
            height: '34px',
            color: '#fff'
        },
        buttonIcon: {
            width: '24px',
            height: '24px',
            color: '#fff'
        },
        closeIcon: {
            width: '20px',
            height: '20px',
            color: '#fff'
        }
    };
};

const TriggerButtonContent = ({updateWidth, updateHeight}) => {
    const context = useContext(AppContext);
    const containerRef = useRef(null);
    const [height, setHeight] = useState(null);
    const [width, setWidth] = useState(null);

    useEffect(() => {
        if (containerRef.current) {
            const newHeight = containerRef.current.offsetHeight;
            const newWidth = containerRef.current.offsetWidth;
            setHeight(newHeight);
            setWidth(newWidth);
            updateHeight && updateHeight(newHeight);
            updateWidth && updateWidth(newWidth);
        }
    }, [updateHeight, updateWidth]);

    useEffect(() => {
        if (containerRef.current) {
            const newHeight = containerRef.current.offsetHeight;
            const newWidth = containerRef.current.offsetWidth;
            if (newHeight !== height) {
                setHeight(newHeight);
                updateHeight && updateHeight(newHeight);
            }
            if (newWidth !== width) {
                setWidth(newWidth);
                updateWidth && updateWidth(newWidth);
            }
        }
    });

    const renderTriggerIcon = () => {
        const {portal_button_icon: buttonIcon = '', portal_button_style: buttonStyle = ''} = context.site || {};
        const Style = Styles({brandColor: context.brandColor});
        const memberGravatar = context.member && context.member.avatar_image;

        if (!buttonStyle.includes('icon') && !context.member) {
            return null;
        }

        if (memberGravatar) {
            return <MemberGravatar gravatar={memberGravatar} />;
        }

        if (context.member) {
            return <UserIcon style={Style.userIcon} />;
        } else {
            if (Object.keys(ICON_MAPPING).includes(buttonIcon)) {
                const ButtonIcon = ICON_MAPPING[buttonIcon];
                return <ButtonIcon style={Style.buttonIcon} />;
            } else if (buttonIcon) {
                return <img style={{width: '26px', height: '26px'}} src={buttonIcon} alt="" />;
            } else {
                if (hasText()) {
                    Style.userIcon.width = '26px';
                    Style.userIcon.height = '26px';
                }
                return <UserIcon style={Style.userIcon} />;
            }
        }
    };

    const hasText = () => {
        const {
            portal_button_signup_text: buttonText,
            portal_button_style: buttonStyle
        } = context.site;
        return ['icon-and-text', 'text-only'].includes(buttonStyle) && !context.member && buttonText;
    };

    const renderText = () => {
        const {
            portal_button_signup_text: buttonText
        } = context.site;
        if (hasText()) {
            return <span className='gh-portal-triggerbtn-label'> {buttonText} </span>;
        }
        return null;
    };

    const onToggle = () => {
        const {showPopup, member, site} = context;

        if (showPopup) {
            context.onAction('closePopup');
            return;
        }

        if (member) {
            context.onAction('openPopup', {page: 'accountHome'});
            return;
        }

        if (isSigninAllowed({site})) {
            const page = isInviteOnlySite({site}) ? 'signin' : 'signup';
            context.onAction('openPopup', {page});
            return;
        }
    };

    const hasTextValue = hasText();
    const {member} = context;
    const triggerBtnClass = member ? 'halo' : '';

    if (hasTextValue) {
        return (
            <div className='gh-portal-triggerbtn-wrapper' ref={containerRef}>
                <div
                    className='gh-portal-triggerbtn-container with-label'
                    onClick={onToggle}
                    data-testid='portal-trigger-button'
                >
                    {renderTriggerIcon()}
                    {renderText()}
                </div>
            </div>
        );
    }
    return (
        <div className='gh-portal-triggerbtn-wrapper'>
            <div
                className={'gh-portal-triggerbtn-container ' + triggerBtnClass}
                onClick={onToggle}
                data-testid='portal-trigger-button'
            >
                {renderTriggerIcon()}
            </div>
        </div>
    );
};

const TriggerButton = () => {
    const context = useContext(AppContext);
    const [width, setWidth] = useState(null);

    const onWidthChange = useCallback((newWidth) => {
        setWidth(newWidth);
    }, []);

    const hasText = () => {
        const {
            portal_button_signup_text: buttonText,
            portal_button_style: buttonStyle
        } = context.site;
        return ['icon-and-text', 'text-only'].includes(buttonStyle) && !context.member && buttonText;
    };

    const renderFrameStyles = () => {
        const styles = `
            :root {
                --brandcolor: ${context.brandColor}
            }
        ` + TriggerButtonStyle;
        return (
            <style dangerouslySetInnerHTML={{__html: styles}} />
        );
    };

    console.log(`Mounting TriggerButton`);
    console.log(`context`, context);
    const site = context.site;
    const {portal_button: portalButton} = site || {};
    const {showPopup} = context;

    if (!portalButton || !isSigninAllowed({site}) || hasMode(['offerPreview'])) {
        return null;
    }

    const hasTextValue = hasText();
    const Style = Styles({brandColor: context.brandColor, hasText: hasTextValue});

    const frameStyle = {
        ...Style.frame
    };
    if (width) {
        const updatedWidth = width + 2;
        frameStyle.width = `${updatedWidth}px`;
    }

    return (
        <Frame 
            dataTestId='portal-trigger-frame' 
            className='gh-portal-triggerbtn-iframe' 
            style={frameStyle} 
            title="portal-trigger" 
            head={renderFrameStyles()}
        >
            <TriggerButtonContent isPopupOpen={showPopup} updateWidth={onWidthChange} />
        </Frame>
    );
};

export default TriggerButton;