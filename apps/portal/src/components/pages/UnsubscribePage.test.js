import {render, screen} from '../../utils/test-utils';
import UnsubscribePage from './UnsubscribePage';
import {newsletters as Newsletters, site as FixtureSite, member as FixtureMember} from '../../utils/test-fixtures';

const setup = (overrides) => {
    const {mockOnActionFn, ...utils} = render(
        <UnsubscribePage />,
        {
            overrideContext: {
                ...overrides
            }
        }
    );

    // let emailInput;
    // let submitButton;
    // let signupButton;
    let emailPreferencesTitle;

    try {
        emailPreferencesTitle = utils.queryByText(/Email preferences/i);
        // emailInput = utils.getByLabelText(/email/i);
        // submitButton = utils.queryByRole('button', {name: 'Continue'});
        // signupButton = utils.queryByRole('button', {name: 'Sign up'});
    } catch (err) {
        // ignore
    }

    return {
        // emailInput,
        // submitButton,
        // signupButton,
        emailPreferencesTitle,
        mockOnActionFn,
        ...utils
    };
};

describe('Logged out UnsubscribePage', () => {
    beforeEach(() => {
        // Mock window.location
        // https://ronald.ink/?uuid=a61d0374-ba99-4dc4-9083-4c73a3e2745e&newsletter=ddb8e302-f165-46ae-8a87-01077765548c&action=unsubscribe
        Object.defineProperty(window, 'location', {
            value: new URL(`https://portal.localhost/?uuid=${FixtureMember.subbedToNewsletter.uuid}&newsletter=${Newsletters[0].id}&action=unsubscribe`),
            writable: true
        });
    });
    test('renders', () => {
        const {emailPreferencesTitle} = setup({
            site: FixtureSite.singleTier.onlyFreePlanWithoutStripe,
            member: FixtureMember.subbedToNewsletter,
            newsletters: Newsletters,
            pageData: Newsletters[0]
        });
        screen.debug(emailPreferencesTitle);
        expect(emailPreferencesTitle).toBeInTheDocument();
    });
});
