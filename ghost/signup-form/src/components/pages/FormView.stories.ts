import type {Meta, StoryObj} from '@storybook/react';

import {FormView} from './FormView';

const meta = {
    title: 'Form View',
    component: FormView,
    tags: ['autodocs']
} satisfies Meta<typeof FormView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Full: Story = {
    args: {
        title: 'Signup Forms Weekly',
        description: 'An independent publication about embeddable signup forms.',
        logo: 'https://user-images.githubusercontent.com/65487235/157884383-1b75feb1-45d8-4430-b636-3f7e06577347.png',
        backgroundColor: '#eeeeee',
        buttonColor: '#ff0095',
        loading: false,
        error: '',
        isMinimal: false,
        onSubmit: () => {}
    }
};

export const FullDark: Story = {
    args: {
        title: 'Signup Forms Weekly',
        description: 'An independent publication about embeddable signup forms.',
        logo: 'https://user-images.githubusercontent.com/65487235/157884383-1b75feb1-45d8-4430-b636-3f7e06577347.png',
        backgroundColor: '#333333',
        buttonColor: '#ff0095',
        loading: false,
        error: '',
        isMinimal: false,
        onSubmit: () => {}
    }
};

export const Minimal: Story = {
    args: {
        buttonColor: '#ff0095',
        loading: false,
        error: '',
        isMinimal: true,
        onSubmit: () => {}
    },
    tags: ['transparency-grid']
};
