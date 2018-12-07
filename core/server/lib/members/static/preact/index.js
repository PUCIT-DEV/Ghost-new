import './styles/members.css';
import {IconEmail, IconLock, IconName} from './components/icons';
import { Component } from 'preact';
const origin = new URL(window.location).origin;
const membersApi = location.pathname.replace(/\/members\/auth\/?$/, '/ghost/api/v2/members');
const storage = window.localStorage;
var layer0 = require('./layer0');

function getFreshState() {
    const [hash, formType, query] = window.location.hash.match(/^#([^?]+)\??(.*)$/) || ['#signin?', 'signin', ''];
    console.log({hash, formType, query})
    return {
        formData: {},
        query,
        formType,
        showError: false
    };
}

export default class App extends Component {
    constructor() {
        super();
        this.state = getFreshState();
        this.gatewayFrame = '';
        window.addEventListener("hashchange", () => this.onHashChange(), false);
    }

    loadGateway() {
        const blogUrl = window.location.href.substring(0, window.location.href.indexOf('/members/auth'));
        const frame = window.document.createElement('iframe');
        frame.id = 'member-gateway';
        frame.style.display = 'none';
        frame.src = `${blogUrl}/members/gateway`;
        frame.onload =  () => {
            this.gatewayFrame = layer0(frame);
        };
        document.body.appendChild(frame);
    }

    componentDidMount() {
        this.loadGateway();
    }

    onHashChange() {
        this.setState(getFreshState());
    }

    onInputChange(e, name) {
        let value = e.target.value;
        this.setState({
            formData: {
                ...this.state.formData,
                [name]: value
            }
        });
    }

    submitForm(e) {
        e.preventDefault();
        switch (this.state.formType) {
            case 'signin':
                this.signin(this.state.formData);
                break;
            case 'signup':
                this.signup(this.state.formData);
                break;
            case 'request-password-reset':
                this.requestPasswordReset(this.state.formData);
                break;
            case 'password-reset-sent':
                this.resendPasswordResetEmail(this.state.formData)
                break;
            case 'reset-password':
                this.resetPassword(this.state.formData)
                break;
        }
        return false;
    }

    signin({ email, password }) {
        this.gatewayFrame.call('signin', {email, password}, function (err, successful) {
            if (err || !successful) {
                console.log("Unable to login", err);
            }
            console.log("Successfully logged in");
        });
    }

    signup({ name, email, password }) {
        this.gatewayFrame.call('signup', { name, email, password }, function (err, successful) {
            if (err || !successful) {
                console.log("Unable to signup", err);
            }
            console.log("Successfully signed up");
        });
    }

    requestPasswordReset({ email }) {
        this.gatewayFrame.call('request-password-reset', {email}, function (err, successful) {
            if (err || !successful) {
                console.log("Unable to send email", err);
            }
            window.location.hash = 'password-reset-sent';
            console.log("Email sent");
        });
    }

    resendPasswordResetEmail({ email }) {
        this.gatewayFrame.call('request-password-reset', {email}, function (err, successful) {
            if (err || !successful) {
                console.log("Unable to send email", err);
            }
            window.location.hash = 'password-reset-sent';
            console.log("Email sent");
        });
    }

    resetPassword({ password }) {
        const queryParams = new URLSearchParams(this.state.query);
        const token = queryParams.get('token') || '';
        this.gatewayFrame.call('reset-password', {password, token}, function (err, successful) {
             if (err || successful) {
                 console.log("Unable to send email", err);
             }
             console.log("Email sent");
        });
    }

    showErrorType(errorType) {
        if (!this.state.showError) {
            return false;
        }
        let value = '';
        switch(errorType) {
            case 'email-not-found':
                return false;
            case 'no-password':
                value = this.state.formData['password'];
                return (!value);
            case 'no-email':
                value = this.state.formData['email'];
                return (!value);
            case 'no-name':
                value = this.state.formData['name'];
                return (!value);
            case 'invalid-credentials':
                return false;
            case 'email-exists':
                return false;
        }
    }

    renderError({errorType, formType}) {
        if (this.showErrorType(errorType)) {
            let errorLabel = '';
            switch(errorType) {
                case 'email-not-found':
                    errorLabel = "We couldn't find user with this email";
                    break;
                case 'no-password':
                    errorLabel = "Enter password";
                    break;
                case 'no-email':
                    errorLabel = "Enter email";
                    break;
                case 'no-name':
                    errorLabel = "Enter name";
                    break;
                case 'invalid-credentials':
                    errorLabel = "Invalid credentials";
                    break;
                case 'email-exists':
                    errorLabel = "Email already exists";
                    break;
            }
            return (
                <span style={{color: 'red'}}> {errorLabel} </span>
            )
        }
        return null;
    }

    renderFormHeaders(formType) {
        let mainTitle = '';
        let ctaTitle = '';
        let ctaLabel = '';
        let hash = '';
        switch (formType) {
            case 'signup':
                mainTitle = 'Sign Up';
                ctaTitle = 'Already a member?';
                ctaLabel = 'Log in';
                hash = 'signin';
                break;
            case 'signin':
                mainTitle = 'Log In';
                ctaTitle = 'Not a member?';
                ctaLabel = 'Sign up';
                hash = 'signup';
                break;
            case 'request-password-reset':
                mainTitle = 'Reset password';
                ctaTitle = '';
                ctaLabel = 'Log in';
                hash = 'signin';
                break;
            case 'password-reset-sent':
                mainTitle = 'Reset password';
                ctaTitle = '';
                ctaLabel = 'Log in';
                hash = 'signin';
                break;
            case 'reset-password':
                mainTitle = 'Reset password';
                ctaTitle = '';
                ctaLabel = 'Log in';
                hash = 'signin';
                break;
        }
        return (
            <div className="flex flex-column">
                <div className="gm-logo"></div>
                <div className="gm-auth-header">
                    <h1>{ mainTitle }</h1>
                    <div className="flex items-baseline">
                        <h4>{ ctaTitle }</h4>
                        <a href="javascript:;"
                            onClick={(e) => {window.location.hash = hash}}
                        >
                            {ctaLabel}
                        </a>
                    </div>
                </div>
            </div>
        )
    }

    renderFormInput({type, name, label, icon, placeholder, required, formType}) {
        let value = this.state.formData[name];
        let className = "";
        let forgot = (type === 'password' && formType === 'signin');

        className += (value ? "gm-input-filled" : "") + (forgot ? " gm-forgot-input" : "");

        return (
            <div className="mt10">
                <div className="gm-floating-input">
                    <input
                        type={ type }
                        name={ name }
                        key={ name }
                        placeholder={ placeholder }
                        value={ value || '' }
                        onInput={ (e) => this.onInputChange(e, name) }
                        required = {required}
                        className={ className }
                    />
                    <label for={ name }><i>{icon}</i> { label }</label>
                    { (forgot ? <a href="javascript:;" className="gm-forgot-link" onClick={(e) => {window.location.hash = 'request-password-reset'}}>Forgot</a> : "") }
                </div>
                <span> {this.renderError({errorType: `no-${name}`, formType})} </span>
            </div>
        )
    }

    renderFormText({formType}) {
        return (
            <div className="mt9">
                <span> Please check your inbox! </span>
            </div>
        )
    }

    onSubmitClick(e) {
        this.setState({
            showError: true
        });
    }

    renderFormSubmit({buttonLabel, formType}) {
        return (
            <div className="mt8">
                <button type="submit" name={ formType } className="gm-btn-blue" onClick={(e) => this.onSubmitClick(e)}>{ buttonLabel }</button>
            </div>
        )
    }

    renderFormSection(formType) {
        const emailInput = this.renderFormInput({
            type: 'email',
            name: 'email',
            label: 'Email',
            icon: IconEmail,
            placeholder: 'Email...',
            required: true,
            formType: formType
        });
        const passwordInput = this.renderFormInput({
            type: 'password',
            name: 'password',
            label: 'Password',
            icon: IconLock,
            placeholder: 'Password...',
            required: true,
            formType: formType
        });
        const nameInput = this.renderFormInput({
            type: 'text',
            name: 'name',
            label: 'Name',
            icon: IconName,
            placeholder: 'Name...',
            required: true,
            formType: formType
        });
        const formText = this.renderFormText({formType});

        let formElements = [];
        let buttonLabel = '';
        switch (formType) {
            case 'signin':
                buttonLabel = 'Log in';
                formElements = [emailInput, passwordInput, this.renderFormSubmit({formType, buttonLabel})];
                break;
            case 'signup':
                buttonLabel = 'Sign up';
                formElements = [nameInput, emailInput, passwordInput, this.renderFormSubmit({formType, buttonLabel})];
                break;
            case 'request-password-reset':
                buttonLabel = 'Send reset password instructions';
                formElements = [emailInput, this.renderFormSubmit({formType, buttonLabel})];
                break;
            case 'password-reset-sent':
                buttonLabel = 'Resend email';
                formElements = [formText, this.renderFormSubmit({formType, buttonLabel})];
                break;
            case 'reset-password':
                buttonLabel = 'Set password';
                formElements = [passwordInput, this.renderFormSubmit({formType, buttonLabel})];
                break;
        }
        return (
            <div className="flex flex-column nt1">
                <form className={ `gm-` + formType + `-form` } onSubmit={(e) => this.submitForm(e)}>
                    { formElements }
                </form>
            </div>
        )
    }

    renderFormComponent(formType = this.state.formType) {
        return (
            <div className="gm-modal-container">
                <div className="gm-modal gm-auth-modal">
                    {this.renderFormHeaders(formType)}
                    {this.renderFormSection(formType)}
                </div>
            </div>
        );
    }

    render() {
        return (
            <div className="gm-auth-page">
                {this.renderFormComponent()}
            </div>
        );
    }
}
