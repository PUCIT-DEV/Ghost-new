import ExitSettingsButton from './components/ExitSettingsButton';
import Settings from './components/Settings';
import Sidebar from './components/Sidebar';
import Users from './components/settings/general/Users';
import {Heading, topLevelBackdropClasses} from '@tryghost/admin-x-design-system';
import {ReactNode, useEffect} from 'react';
import {canAccessSettings, isEditorUser} from '@tryghost/admin-x-framework/api/users';
import {toast} from 'react-hot-toast';
import {useGlobalData} from './components/providers/GlobalDataProvider';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const Page: React.FC<{children: ReactNode}> = ({children}) => {
    return <>
        <div className='sticky top-0 z-30 px-[5vmin] py-4 tablet:fixed tablet:px-6'>
            <ExitSettingsButton />
        </div>

        <div className="mx-auto flex max-w-[1080px] flex-col px-[5vmin] pb-[12vmin] tablet:flex-row tablet:items-start tablet:gap-x-10 tablet:py-[8vmin]" id="admin-x-settings-content">
            {children}
        </div>
    </>;
};

const MainContent: React.FC = () => {
    const {currentUser} = useGlobalData();
    const {route, updateRoute, loadingModal} = useRouting();

    useEffect(() => {
        // resets any toasts that may have been left open on initial load
        toast.remove();
    }, []);

    useEffect(() => {
        if (!canAccessSettings(currentUser) && route !== `staff/${currentUser.slug}`) {
            updateRoute(`staff/${currentUser.slug}`);
        }
    }, [currentUser, route, updateRoute]);

    if (!canAccessSettings(currentUser)) {
        return null;
    }

    if (isEditorUser(currentUser)) {
        return (
            <Page>
                <div className='w-full'>
                    <Heading className='mb-10'>Settings</Heading>
                    <Users highlight={false} keywords={[]} />
                </div>
            </Page>
        );
    }

    return (
        <Page>
            {loadingModal && <div className={`fixed inset-0 z-40 h-[calc(100vh-55px)] w-[100vw] tablet:h-[100vh] ${topLevelBackdropClasses}`} />}

            {/* Sidebar */}
            <div className="sticky -top-px z-20 mt-[-55px] min-w-[260px] grow-0 bg-white pt-[52px] dark:bg-black tablet:fixed tablet:top-[8vmin] tablet:mt-0 tablet:basis-[260px] tablet:pt-0">
                <div className="relative w-full bg-white dark:bg-black">
                    <Sidebar />
                </div>
            </div>
            <div className="relative flex-auto pt-[10vmin] tablet:ml-[330px] tablet:pt-0">
                <Settings />
            </div>
        </Page>
    );
};

export default MainContent;
