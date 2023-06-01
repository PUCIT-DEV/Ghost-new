import React, {ComponentProps, useState} from 'react';
import pages, {Page, PageName} from './pages';
import {AppContextProvider, SignupFormOptions} from './AppContext';
import {ContentBox} from './components/ContentBox';
import {userEvent, within} from '@storybook/testing-library';
import type {Meta, ReactRenderer, StoryObj} from '@storybook/react';
import type {PlayFunction} from '@storybook/types';

const Preview: React.FC<SignupFormOptions & {
    pageBackgroundColor: string
    pageTextColor: string
    simulateApiError: boolean
}> = ({simulateApiError, pageBackgroundColor, pageTextColor, ...options}) => {
    const [page, setPage] = useState<Page>({
        name: 'FormPage',
        data: {}
    });

    const _setPage = (name: PageName, data: any) => {
        setPage(() => ({
            name,
            data
        }));
    };

    const PageComponent = pages[page.name];
    const data = page.data as any;

    return <AppContextProvider value={{
        page,
        setPage: _setPage,
        api: {
            sendMagicLink: async () => {
                // Sleep to ensure the loading state is visible enough
                await new Promise((resolve) => {
                    setTimeout(resolve, 2000);
                });

                return simulateApiError ? false : true;
            }
        },
        options,
        scriptTag: document.createElement('div')
    }}>
        <div style={{width: '100%', height: '100%', backgroundColor: pageBackgroundColor, color: pageTextColor}}>
            <ContentBox>
                <PageComponent {...data} />
            </ContentBox>
        </div>
    </AppContextProvider>;
};

const meta = {
    title: 'Preview',
    component: Preview
} satisfies Meta<typeof Preview>;

export default meta;
type Story = StoryObj<typeof meta>;

const play: PlayFunction<ReactRenderer, ComponentProps<typeof Preview>> = async ({canvasElement}) => {
    const canvas = within(canvasElement);

    const emailInput = canvas.getByTestId('input');

    await userEvent.type(emailInput, 'test@example.com', {
        delay: 100
    });

    const submitButton = canvas.getByTestId('button');
    userEvent.click(submitButton);
};

export const Full: Story = {
    args: {
        title: 'Signup Forms Weekly',
        description: 'An independent publication about embeddable signup forms.',
        logo: 'https://user-images.githubusercontent.com/65487235/157884383-1b75feb1-45d8-4430-b636-3f7e06577347.png',
        backgroundColor: '#eeeeee',
        buttonColor: '#ff0095',
        site: 'localhost',
        labels: ['label-1', 'label-2'],
        simulateApiError: false,
        pageBackgroundColor: '#ffffff',
        pageTextColor: '#000000'
    },

    play
};

export const Minimal: Story = {
    args: {
        site: 'localhost',
        labels: ['label-1', 'label-2'],
        buttonColor: '#ff0095',
        simulateApiError: false,
        pageBackgroundColor: '#ffffff',
        pageTextColor: '#000000'
    },

    play
};

export const MinimalOnDark: Story = {
    args: {
        site: 'localhost',
        labels: ['label-1', 'label-2'],
        buttonColor: '#ff0095',
        simulateApiError: false,
        pageBackgroundColor: '#122334',
        pageTextColor: '#f7f7f7'
    },

    play
};
