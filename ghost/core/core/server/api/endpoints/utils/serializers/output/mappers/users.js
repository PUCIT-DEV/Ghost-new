const clean = require('../utils/clean');
const url = require('../utils/url');

module.exports = (model, frame) => {
    const jsonModel = model.toJSON ? model.toJSON(frame.options) : model;

    url.forUser(model.id, jsonModel, frame.options);

    clean.author(jsonModel, frame);

    if ('staffFields' in jsonModel) {
        const parsedFields = jsonModel.staffFields.map((staffField) => {
            const group = staffField.field.name ? 'custom' : 'social';
            const parsed = {
                name: staffField.field.name,
                value: staffField.value,
                group
            };
            return parsed;
        });
        jsonModel.fields_custom = parsedFields.filter((parsed) => {
            return parsed.group === 'custom';
        });
        jsonModel.fields_social = parsedFields.filter((parsed) => {
            return parsed.group === 'social';
        });
        delete jsonModel.staffFields;
    }

    return jsonModel;
};
