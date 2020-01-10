import Component from '@ember/component';

export default Component.extend({
    _file: null,

    acceptEncoding: null,
    uploadButtonText: 'Text',
    uploadButtonDisabled: true,

    shouldResetForm: true,

    // closure actions
    onUpload() {},
    onAdd() {},

    actions: {
        upload() {
            if (!this.uploadButtonDisabled && this._file) {
                this.onUpload(this._file);
            }

            // Prevent double post by disabling the button.
            this.set('uploadButtonDisabled', true);

            // Reset form
            if (this.shouldResetForm) {
                this.element.closest('form').reset();
            }
        }
    },

    change(event) {
        this.set('uploadButtonDisabled', false);
        this.onAdd();
        this._file = event.target.files[0];
    }
});
