import React from 'react';
import {render, fireEvent, waitFor} from 'test-utils';
import AccountPlanPage from './AccountPlanPage';

const setup = (overrides) => {
    const {mockOnActionFn, context, ...utils} = render(
        <AccountPlanPage />
    );
    const monthlyCheckboxEl = utils.getByLabelText('Monthly');
    const yearlyCheckboxEl = utils.getByLabelText('Yearly');
    const continueBtn = utils.queryByRole('button', {name: 'Continue'});
    return {
        monthlyCheckboxEl,
        yearlyCheckboxEl,
        continueBtn,
        mockOnActionFn,
        context,
        ...utils
    };
};

describe('Account Plan Page', () => {
    test('renders', () => {
        const {monthlyCheckboxEl, yearlyCheckboxEl, continueBtn} = setup();

        expect(monthlyCheckboxEl).toBeInTheDocument();
        expect(yearlyCheckboxEl).toBeInTheDocument();
        expect(continueBtn).toBeInTheDocument();
    });

    test('can choose plan and continue', async () => {
        const {mockOnActionFn, monthlyCheckboxEl, continueBtn} = setup();
        expect(monthlyCheckboxEl.checked).toEqual(false);
        fireEvent.click(monthlyCheckboxEl);
        expect(monthlyCheckboxEl.checked).toEqual(true);
        await waitFor(() => {
            expect(continueBtn).toBeEnabled();
        });

        fireEvent.click(continueBtn);
        expect(mockOnActionFn).toHaveBeenCalledWith('checkoutPlan', {plan: 'Monthly'});
    });
});
