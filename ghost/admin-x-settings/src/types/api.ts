export type SettingValue = string | boolean | null;

export type Setting = {
    key: string;
    value: SettingValue;
}

export type User = {
    id: string;
    name: string;
    slug: string;
    email: string;
    profile_image: string;
    cover_image: string|null;
    bio: string;
    website: string;
    location: string;
    facebook: string;
    twitter: string;
    accessibility: string|null;
    status: string;
    meta_title: string|null;
    meta_description: string|null;
    tour: string|null;
    last_seen: string|null;
    created_at: string;
    updated_at: string;
    comment_notifications: boolean;
    free_member_signup_notification: boolean;
    paid_subscription_canceled_notification: boolean;
    paid_subscription_started_notification: boolean;
    mention_notifications: boolean;
    milestone_notifications: boolean;
    roles: UserRole[];
    url: string;
}

export type UserRoleType = 'Owner' | 'Administrator' | 'Editor' | 'Author' | 'Contributor';

export type UserRole = {
    id: string;
    name: UserRoleType;
    description: string;
    created_at: string;
    updated_at: string;
};

export type SiteData = {
    title: string;
    description: string;
    logo: string;
    icon: string;
    accent_color: string;
    url: string;
    locale: string;
    version: string;
};

export type Post = {
    id: string;
    url: string;
};

type CustomThemeSettingData =
    { type: 'text', value: string | null, default: string | null } |
    { type: 'color', value: string, default: string } |
    { type: 'image', value: string | null } |
    { type: 'boolean', value: boolean, default: boolean } |
    {
        type: 'select',
        value: string
        default: string
        options: string[]
    };

export type CustomThemeSetting = CustomThemeSettingData & {
    id: string
    key: string
    // homepage and post are the only two groups we handle, but technically theme authors can put other things in package.json
    group?: 'homepage' | 'post' | string
}
