import type {NiceModalHocProps} from '@ebay/nice-modal-react';
import type {RoutingModalProps} from '../RoutingProvider';

import AboutModal from '../../settings/general/About';
import AddIntegrationModal from '../../settings/advanced/integrations/AddIntegrationModal';
import AddNewsletterModal from '../../settings/email/newsletters/AddNewsletterModal';
import AddOfferModal from '../../settings/membership/offers/AddOfferModal';
import AddRecommendationModal from '../../settings/membership/recommendations/AddRecommendationModal';
import AmpModal from '../../settings/advanced/integrations/AmpModal';
import AnnouncementBarModal from '../../settings/site/AnnouncementBarModal';
import CustomIntegrationModal from '../../settings/advanced/integrations/CustomIntegrationModal';
import DesignAndThemeModal from '../../settings/site/DesignAndThemeModal';
import EditOfferModal from '../../settings/membership/offers/EditOfferModal';
import EditRecommendationModal from '../../settings/membership/recommendations/EditRecommendationModal';
import EmbedSignupFormModal from '../../settings/membership/embedSignup/EmbedSignupFormModal';
import FirstpromoterModal from '../../settings/advanced/integrations/FirstPromoterModal';
import HistoryModal from '../../settings/advanced/HistoryModal';
import InviteUserModal from '../../settings/general/InviteUserModal';
import NavigationModal from '../../settings/site/NavigationModal';
import NewsletterDetailModal from '../../settings/email/newsletters/NewsletterDetailModal';
import OffersModal from '../../settings/membership/offers/OffersModal';
import PinturaModal from '../../settings/advanced/integrations/PinturaModal';
import PortalModal from '../../settings/membership/portal/PortalModal';
import SlackModal from '../../settings/advanced/integrations/SlackModal';
import StripeConnectModal from '../../settings/membership/stripe/StripeConnectModal';
import TierDetailModal from '../../settings/membership/tiers/TierDetailModal';
import UnsplashModal from '../../settings/advanced/integrations/UnsplashModal';
import UserDetailModal from '../../settings/general/UserDetailModal';
import ZapierModal from '../../settings/advanced/integrations/ZapierModal';

const modals = {
    AddIntegrationModal,
    AddNewsletterModal,
    AddRecommendationModal,
    AmpModal,
    CustomIntegrationModal,
    DesignAndThemeModal,
    EditRecommendationModal,
    FirstpromoterModal,
    HistoryModal,
    InviteUserModal,
    NavigationModal,
    NewsletterDetailModal,
    PinturaModal,
    PortalModal,
    SlackModal,
    StripeConnectModal,
    TierDetailModal,
    UnsplashModal,
    UserDetailModal,
    ZapierModal,
    AnnouncementBarModal,
    EmbedSignupFormModal,
    OffersModal,
    AddOfferModal,
    EditOfferModal,
    AboutModal
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} satisfies {[key: string]: ModalComponent<any>};

export default modals;

export type ModalName = keyof typeof modals;
export type ModalComponent<Props = object> = React.FC<NiceModalHocProps & RoutingModalProps & Props>;
