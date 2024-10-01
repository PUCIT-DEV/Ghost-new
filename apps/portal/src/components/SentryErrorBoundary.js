import * as Sentry from '@sentry/react';

function SentryErrorBoundary({site, children}) {
    const {portal_sentry: portalSentry} = site || {};
    if (portalSentry && portalSentry.dsn) {
        return (
            <Sentry.ErrorBoundary>
                {children}
            </Sentry.ErrorBoundary>
        );
    }
    return (
        <>
            {children}
        </>
    );
}

export default SentryErrorBoundary;