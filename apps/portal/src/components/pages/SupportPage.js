import {useEffect, useState, useContext} from 'react';
import SupportError from './SupportError';
import SupportSuccess from './SupportSuccess';
import LoadingPage from './LoadingPage';
import setupGhostApi from '../../utils/api';
import AppContext from '../../AppContext';

const SupportPage = () => {
    const {site} = useContext(AppContext);
    const [isLoading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function checkoutDonation() {
            const siteUrl = window.location.origin;
            const currentUrl = siteUrl + window.location.pathname;
            const successUrl = `${currentUrl}#/portal/support/success`;
            const cancelUrl = `${currentUrl}#/portal/support/error`;
            const api = setupGhostApi({siteUrl});

            try {
                const response = await api.member.checkoutDonation({successUrl, cancelUrl});

                if (response.url) {
                    await window.location.assign(response.url);
                }
            } catch (err) {
                const errorMessage = err.message || 'There was an error processing your payment. Please try again.';
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        }

        checkoutDonation();

    // Do it once
    // eslint-disable-next-line
    }, []);

    if (isLoading) {
        const title = `Support ${site.title}`;
        return (
            <div>
                <h1>{title}</h1>
                <LoadingPage />
            </div>
        );
    }

    if (error) {
        return <SupportError error={error} />;
    }

    return <SupportSuccess />;
};

export default SupportPage;
