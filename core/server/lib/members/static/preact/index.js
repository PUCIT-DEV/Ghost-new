import './styles/members.css';
import IconEmail from './assets/images/icon-email.svg'
import IconLock from './assets/images/icon-lock.svg'
import IconName from './assets/images/icon-name.svg'
import { Component } from 'preact';
const origin = new URL(window.location).origin;
const membersApi = location.pathname.replace(/\/members\/auth\/?$/, '/ghost/api/v2/members');
const storage = window.localStorage;
var layer0 = require('./layer0');

function getFreshState() {
    const [hash, formType, query] = window.location.hash.match(/^#(\w+)\??(.*)$/) || ['#signin?', 'signin', ''];
    console.log({hash, formType, query})
    return {
        formData: {},
        formType
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
        if (value) {

        }
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
        }
        return false;
    }

    signin({ email, password }) {
        this.gatewayFrame.call('signin', {email, password}, function (err, successful) {
            if (err) {
                console.log("Unable to login", err);
            }
            console.log("Successfully logged in");
        });
    }

    signup({ name, email, password }) {
        this.gatewayFrame.call('signup', { name, email, password }, function (err, successful) {
            if (err) {
                console.log("Unable to signup", err);
            }
            console.log("Successfully signed up");
        });
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
        }
        return (
            <div className="flex flex-column">
                <div className="gm-logo"></div>
                <div className="flex justify-between items-end mt2 gm-form-headers">
                    <h1>{ mainTitle }</h1>
                    <div className="flex items-baseline gm-headers-cta">
                        <h4>{ ctaTitle }</h4>
                        <div>
                            <a href="javascript:;"
                                onClick={(e) => {window.location.hash = hash}}
                            >
                                {ctaLabel}
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    renderFormInput({type, name, label, icon, placeholder, formType}) {
        let value = this.state.formData[name];
        let className = "";
        let forgot = (type === 'password' && formType === 'signin');

        className += (value ? "gm-input-filled" : "") + (forgot ? " gm-password-forgot" : "");

        return (
            <div className="mt9 gm-form-element">
                <input
                    type={ type }
                    name={ name }
                    key={ name }
                    placeholder={ placeholder }
                    value={ value || '' }
                    onInput={ (e) => this.onInputChange(e, name) }
                    className={ className }
                />
                <label for={ name } className="flex items-center"><img src={icon} className="mr2" /> { label }</label>
                { (forgot ? <a href="javascript:;" className="gm-cta-forgot">Forgot</a> : "") }
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
            formType: formType
        });
        const passwordInput = this.renderFormInput({
            type: 'password',
            name: 'password',
            label: 'Password',
            icon: IconLock,
            placeholder: 'Password...',
            formType: formType
        });
        const nameInput = this.renderFormInput({
            type: 'text',
            name: 'name',
            label: 'Name',
            icon: IconName,
            placeholder: 'Name...',
            formType: formType
        });
        let formElements = [];
        let buttonLabel = '';
        switch (formType) {
            case 'signin':
                formElements = [emailInput, passwordInput];
                buttonLabel = 'Log in';
                break;
            case 'signup':
                formElements = [nameInput, emailInput, passwordInput];
                buttonLabel = 'Sign up';
                break;
            case 'reset':
                formElements = [emailInput];
                buttonLabel = 'Send reset password instructions';
                break;
        }
        return (
            <div className="flex flex-column nt4">
                <form className={ `gm-` + formType + `-form` } onSubmit={(e) => this.submitForm(e)}>
                    { formElements }
                    <button type="submit" name={ formType } className="mt8 btn-blue">{ buttonLabel }</button>
                </form>
            </div>
        )
    }

    renderFormComponent(formType = this.state.formType) {
        return (
            <div className="gm-modal-container">
                <div className="gm-modal">
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
