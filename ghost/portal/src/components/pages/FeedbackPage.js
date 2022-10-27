import {useContext, useEffect, useState} from 'react';
import AppContext from '../../AppContext';
import {ReactComponent as ThumbDownIcon} from '../../images/icons/thumbs-down.svg';
import {ReactComponent as ThumbUpIcon} from '../../images/icons/thumbs-up.svg';
import {ReactComponent as WarningIcon} from '../../images/icons/warning-fill.svg';
import setupGhostApi from '../../utils/api';
import {HumanReadableError} from '../../utils/errors';
import ActionButton from '../common/ActionButton';
import CloseButton from '../common/CloseButton';
import LoadingPage from './LoadingPage';

const React = require('react');

export const FeedbackPageStyles = `
    .gh-portal-feedback {

    }

    .gh-portal-feedback .gh-feedback-icon {
        padding: 10px 0;
        text-align: center;
        color: var(--brandcolor);
        width: 48px;
        margin: 0 auto;
    }

    .gh-portal-feedback .gh-feedback-icon.gh-feedback-icon-error {
        color: #f50b23;
    }

    .gh-portal-feedback .gh-portal-text-center {
        padding: 15px 0;
    }

    .gh-portal-confirm-title {
        line-height: inherit;
        text-align: center;
        box-sizing: border-box;
        margin: 0;
        margin-bottom: .4rem;
        font-size: 24px;
        font-weight: 700;
        letter-spacing: -.018em;
    }

    .gh-portal-confirm-button {
        width: 100%;
        font-size: 1.3rem;
        line-height: 1.2;
        margin-top: 3.6rem;
    }

    .gh-feedback-buttons-group {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-top: 3.6rem;
    }

    .gh-feedback-button {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-size: 1.4rem;
        line-height: 1.2;
        font-weight: 700;
        border: none;
        border-radius: 22px;
        padding: 12px 8px;
        color: #505050;
        background: none;
        cursor: pointer;
    }

    .gh-feedback-button::before {
        content: '';
        position: absolute;
        width: 100%;
        height: 100%;
        left: 0;
        top: 0;
        border-radius: inherit;
        background: currentColor;
        opacity: 0.10;
    }

    .gh-feedback-button-selected {
        box-shadow: inset 0 0 0 2px currentColor;
    }

    .gh-feedback-button svg {
        width: 24px;
        height: 24px;
        color: inherit;
    }

    .gh-feedback-button svg path {
        stroke-width: 4px;
    }
`;

function ErrorPage({error}) {
    const {onAction} = useContext(AppContext);

    return (
        <div className='gh-portal-content gh-portal-feedback with-footer'>
            <CloseButton />
            <div class="gh-feedback-icon gh-feedback-icon-error">
                <WarningIcon />
            </div>
            <h1 className="gh-portal-main-title">It's not you, it's us</h1>
            <div>
                <p className="gh-portal-text-center">{error}</p>
            </div>
            <ActionButton
                style={{width: '100%'}}
                retry={false}
                onClick = {() => onAction('closePopup')}
                disabled={false}
                brandColor='#000000'
                label={'Close'}
                isRunning={false}
                tabindex='3'
                classes={'sticky bottom'}
            />
        </div>
    );
}

const ConfirmDialog = ({onConfirm, loading, initialScore}) => {
    const {onAction, brandColor} = useContext(AppContext);
    const [score, setScore] = useState(initialScore);

    const stopPropagation = (event) => {
        event.stopPropagation();
    };

    const close = () => {
        onAction('closePopup');
    };

    const submit = async (event) => {
        event.stopPropagation();
        await onConfirm(score);
    };

    const getButtonClassNames = (value) => {
        const baseClassName = 'gh-feedback-button';
        return value === score ? `${baseClassName} gh-feedback-button-selected` : baseClassName;
    };

    const getInlineStyles = (value) => {
        return value === score ? {color: brandColor} : {};
    };

    return (
        <div className="gh-portal-confirm-dialog" onMouseDown={stopPropagation}>
            <h1 className="gh-portal-confirm-title">Give feedback on this post</h1>

            <div className="gh-feedback-buttons-group">
                <button
                    className={getButtonClassNames(1)}
                    style={getInlineStyles(1)}
                    onClick={() => setScore(1)}
                >
                    <ThumbUpIcon />
                    More like this
                </button>

                <button
                    className={getButtonClassNames(0)}
                    style={getInlineStyles(0)}
                    onClick={() => setScore(0)}
                >
                    <ThumbDownIcon />
                    Less like this
                </button>
            </div>

            <ActionButton
                classes="gh-portal-confirm-button"
                retry={false}
                onClick={submit}
                disabled={false}
                brandColor={brandColor}
                label="Submit feedback"
                isRunning={loading}
                tabindex="3"
            />
            <CloseButton close={() => close(false)} />
        </div>
    );
};

async function sendFeedback({siteUrl, uuid, postId, score}) {
    const ghostApi = setupGhostApi({siteUrl});
    await ghostApi.feedback.add({uuid, postId, score});
}

const LoadingFeedbackView = ({action}) => {
    useEffect(() => {
        action();
    });

    return <LoadingPage/>;
};

const ConfirmFeedback = ({positive}) => {
    const {onAction, brandColor} = useContext(AppContext);

    const icon = positive ? <ThumbUpIcon /> : <ThumbDownIcon />;

    return (
        <div className='gh-portal-content gh-portal-feedback'>
            <CloseButton />

            <div className="gh-feedback-icon">
                {icon}
            </div>
            <h1 className="gh-portal-main-title">Thanks for the feedback!</h1>
            <p className="gh-portal-text-center">Your input helps shape what gets published.</p>
            <ActionButton
                style={{width: '100%'}}
                retry={false}
                onClick = {() => onAction('closePopup')}
                disabled={false}
                brandColor={brandColor}
                label={'Close'}
                isRunning={false}
                tabindex='3'
                classes={'sticky bottom'}
            />
        </div>
    );
};

export default function FeedbackPage() {
    const {site, pageData, member} = useContext(AppContext);
    const {uuid, postId, score: initialScore} = pageData;
    const [score, setScore] = useState(initialScore);
    const positive = score === 1;

    const isLoggedIn = !!member;

    const [confirmed, setConfirmed] = useState(isLoggedIn);
    const [loading, setLoading] = useState(isLoggedIn);
    const [error, setError] = useState(null);

    const doSendFeedback = async (selectedScore) => {
        setLoading(true);
        try {
            await sendFeedback({siteUrl: site.url, uuid, postId, score: selectedScore});
            setScore(selectedScore);
        } catch (e) {
            const text = HumanReadableError.getMessageFromError(e, 'There was a problem submitting your feedback. Please try again or contact the site owner.');
            setError(text);
        }
        setLoading(false);
    };

    const onConfirm = async (selectedScore) => {
        await doSendFeedback(selectedScore);
        setConfirmed(true);
    };

    // Case: failed
    if (error) {
        return <ErrorPage error={error} />;
    }

    if (!confirmed) {
        return (<ConfirmDialog onConfirm={onConfirm} loading={loading} initialScore={score} />);
    } else {
        if (loading) {
            return <LoadingFeedbackView action={doSendFeedback} />;
        }
    }

    return (<ConfirmFeedback positive={positive} />);
}
