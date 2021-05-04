import Component from '@ember/component';
import DropdownMixin from 'ghost-admin/mixins/dropdown-mixin';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';

export default Component.extend(DropdownMixin, {
    dropdown: service(),

    tagName: 'button',
    attributeBindings: ['href', 'role', 'type'],
    role: 'button',

    // matches with the dropdown this button toggles
    dropdownName: null,

    type: computed(function () {
        return this.tagName === 'button' ? 'button' : null;
    }),

    // Notify dropdown service this dropdown should be toggled
    click(event) {
        this._super(event);
        this.dropdown.toggleDropdown(this.dropdownName, this);

        if (this.tagName === 'a') {
            return false;
        }
    }
});
