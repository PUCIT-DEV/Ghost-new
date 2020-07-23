import ActionButton from '../common/ActionButton';
import AppContext from '../../AppContext';
import {ReactComponent as EnvelopeIcon} from '../../images/icons/envelope.svg';

const React = require('react');

export const MagicLinkStyles = `
    .gh-portal-envelope {
        width: 44px;
        margin: 12px 0 2px;
    }
`;

export default class MagicLinkPage extends React.Component {
    static contextType = AppContext;

    renderFormHeader() {
        return (
            <div className='flex flex-column items-center'>
                <header className='gh-portal-header'>
                    <EnvelopeIcon className='gh-portal-icon gh-portal-envelope' />
                    <h2>Check your inbox!</h2>
                </header>
                <p className='gh-portal-section gh-portal-text-center'>Check your inbox and click on the login link to complete the signin.</p>
            </div>
        );
    }

    renderLoginMessage() {
        return (
            <div className='flex justify-center'>
                <div
                    style={{color: '#3db0ef', fontWeight: 'bold', cursor: 'pointer'}}
                    onClick={() => this.context.onAction('switchPage', {page: 'signin'})}
                >
                    Back to Log in
                </div>
            </div>
        );
    }

    handleClose(e) {
        this.context.onAction('closePopup');
    }

    renderCloseButton() {
        const label = 'Close';
        return (
            <ActionButton
                onClick={e => this.handleClose(e)}
                brandColor={this.context.brandColor}
                label={label}
            />
        );
    }

    render() {
        return (
            <div>
                {this.renderFormHeader()}
                {this.renderCloseButton()}
            </div>
        );
    }
}
