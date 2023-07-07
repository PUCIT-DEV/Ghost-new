import Button from '../../../../admin-x-ds/global/Button';
import List from '../../../../admin-x-ds/global/List';
import ListItem from '../../../../admin-x-ds/global/ListItem';
import ModalPage from '../../../../admin-x-ds/global/modal/ModalPage';
import React, {useContext, useState} from 'react';
import Select from '../../../../admin-x-ds/global/form/Select';
import TextField from '../../../../admin-x-ds/global/form/TextField';
import {SettingsContext} from '../../../providers/SettingsProvider';
import {getHomepageUrl} from '../../../../utils/helpers';

interface PortalLinksPrefs {

}

interface PortalLinkPrefs {
    name: string;
    value: string;
}

const PortalLink: React.FC<PortalLinkPrefs> = ({name, value}) => {
    return (
        <ListItem
            action={<Button color='black' label='Copy' link onClick={(e) => {
                navigator.clipboard.writeText(value);
                const button = e?.target as HTMLButtonElement;
                button.innerText = 'Copied';
                setTimeout(() => {
                    button.innerText = 'Copy';
                }, 1000);
            }}/>}
            hideActions
            separator
        >
            <div className='flex w-full grow items-center gap-5 py-3'>
                <span className='inline-block w-[200px] whitespace-nowrap'>{name}</span>
                <TextField className='border-b-500 grow bg-transparent p-1 text-grey-700' value={value} disabled unstyled />
            </div>
        </ListItem>
    );
};

const PortalLinks: React.FC<PortalLinksPrefs> = () => {
    const [isDataAttributes, setIsDataAttributes] = useState(false);
    const {siteData} = useContext(SettingsContext);

    const toggleIsDataAttributes = () => {
        setIsDataAttributes(!isDataAttributes);
    };

    const homePageURL = getHomepageUrl(siteData!);

    return (
        <ModalPage className='text-base text-black' heading='Links'>
            <p className='-mt-6 mb-16'>Use these {isDataAttributes ? 'data attributes' : 'links'} in your theme to show pages of Portal.</p>

            <List actions={<Button color='green' label={isDataAttributes ? 'Links' : 'Data attributes'} link onClick={toggleIsDataAttributes}/>} title='Generic'>
                <PortalLink name='Default' value={isDataAttributes ? 'data-portal' : `${homePageURL}/#/portal`} />
                <PortalLink name='Sign in' value={isDataAttributes ? 'data-portal="signin"' : `${homePageURL}/#/portal/signin`} />
                <PortalLink name='Sign up' value={isDataAttributes ? 'data-portal="signup"' : `${homePageURL}/#/portal/signup`} />
            </List>

            <List className='mt-14' title='Tiers'>
                <ListItem
                    hideActions
                    separator
                >
                    <div className='flex w-full items-center gap-5 py-3 pr-6'>
                        <span className='inline-block w-[200px] shrink-0 font-bold'>Tier</span>
                        <Select
                            containerClassName='max-w-[400px]'
                            options={[
                                {
                                    label: 'Tier one',
                                    value: 'tier-one'
                                },
                                {
                                    label: 'Tier two',
                                    value: 'tier-two'
                                }
                            ]}
                            onSelect={() => {

                            }}
                        />
                    </div>
                </ListItem>
                <PortalLink name='Signup / Monthly' value={isDataAttributes ? 'data-portal="signup/abc123/monthly"' : `${homePageURL}/#/portal/signup/abc123/monthly`} />
                <PortalLink name='Signup / Yearly' value={isDataAttributes ? 'data-portal="signup/abc123/yearly"' : `${homePageURL}/#/portal/signup/abc123/yearly`} />
                <PortalLink name='Signup / Free' value={isDataAttributes ? 'data-portal="signup/free"' : `${homePageURL}/#/portal/signup/free`} />
            </List>

            <List className='mt-14' title='Account'>
                <PortalLink name='Account' value={isDataAttributes ? 'data-portal="account"' : `${homePageURL}/#/portal/account`} />
                <PortalLink name='Account / Plans' value={isDataAttributes ? 'data-portal="account/plans"' : `${homePageURL}/#/portal/account/plans`} />
                <PortalLink name='Account / Profile' value={isDataAttributes ? 'data-portal="account/profile"' : `${homePageURL}/#/portal/account/profile`} />
                <PortalLink name='Account / Newsletters' value={isDataAttributes ? 'data-portal="account/newsletters"' : `${homePageURL}/#/portal/account/newsletters`} />
            </List>
        </ModalPage>

    );
};

export default PortalLinks;