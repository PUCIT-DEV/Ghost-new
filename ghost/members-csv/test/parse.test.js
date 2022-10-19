const should = require('should');
const path = require('path');
const assert = require('assert');
const {parse} = require('../index');
const csvPath = path.join(__dirname, '/fixtures/');

const readCSV = ({filePath, mapping, defaultLabels}) => parse(filePath, mapping, defaultLabels);

describe('parse', function () {
    it('read csv: empty file', async function () {
        const result = await readCSV({
            filePath: csvPath + 'empty.csv'
        });

        should.exist(result);
        result.length.should.eql(0);
    });

    it('read csv: one column', async function () {
        const result = await readCSV({
            filePath: csvPath + 'single-column-with-header.csv'
        });

        should.exist(result);
        result.length.should.eql(2);
        result[0].email.should.eql('jbloggs@example.com');
        result[1].email.should.eql('test@example.com');
    });

    it('read csv: two columns, 1 filter', async function () {
        const result = await readCSV({
            filePath: csvPath + 'two-columns-with-header.csv'
        });

        should.exist(result);
        result.length.should.eql(2);
        result[0].email.should.eql('jbloggs@example.com');
        result[1].email.should.eql('test@example.com');
    });

    it('read csv: two columns, 2 filters', async function () {
        const result = await readCSV({
            filePath: csvPath + 'two-columns-obscure-header.csv',
            mapping: {
                'Email Address': 'email'
            }
        });

        should.exist(result);
        result.length.should.eql(2);
        result[0].email.should.eql('jbloggs@example.com');
        result[0].id.should.eql('1');
        result[1].email.should.eql('test@example.com');
        result[1].id.should.eql('2');
    });

    it('read csv: two columns with mapping', async function () {
        const result = await readCSV({
            filePath: csvPath + 'two-columns-mapping-header.csv',
            mapping: {
                correo_electronico: 'email',
                nombre: 'name'
            }
        });

        should.exist(result);
        result.length.should.eql(2);
        result[0].email.should.eql('jbloggs@example.com');
        result[0].name.should.eql('joe');
        result[0].id.should.eql('1');

        result[1].email.should.eql('test@example.com');
        result[1].name.should.eql('test');
        result[1].id.should.eql('2');
    });

    it('read csv: two columns with partial mapping', async function () {
        const result = await readCSV({
            filePath: csvPath + 'two-columns-mapping-header.csv',
            mapping: {
                correo_electronico: 'email'
            }
        });

        should.exist(result);
        result.length.should.eql(2);
        result[0].email.should.eql('jbloggs@example.com');
        result[0].nombre.should.eql('joe');
        result[0].id.should.eql('1');

        result[1].email.should.eql('test@example.com');
        result[1].nombre.should.eql('test');
        result[1].id.should.eql('2');
    });

    it('read csv: two columns with empty mapping', async function () {
        const result = await readCSV({
            filePath: csvPath + 'two-columns-mapping-header.csv',
            mapping: {}
        });

        should.exist(result);
        result.length.should.eql(2);
        result[0].correo_electronico.should.eql('jbloggs@example.com');
        result[0].nombre.should.eql('joe');
        result[0].id.should.eql('1');

        result[1].correo_electronico.should.eql('test@example.com');
        result[1].nombre.should.eql('test');
        result[1].id.should.eql('2');
    });

    it('read csv: transforms empty values to nulls', async function () {
        const result = await readCSV({
            filePath: csvPath + 'multiple-records-with-empty-values.csv'
        });

        should.exist(result);
        result.length.should.eql(2);
        result[0].email.should.eql('jbloggs@example.com');
        result[0].name.should.eql('Bob');

        result[1].email.should.eql('test@example.com');
        should.equal(result[1].name, null);
    });

    it('read csv: transforms "subscribed_to_emails" column to "subscribed" property when the mapping is passed in', async function () {
        const mapping = {
            subscribed_to_emails: 'subscribed'
        };
        const result = await readCSV({
            filePath: csvPath + 'subscribed-to-emails-header.csv',
            mapping
        });

        assert.ok(result);
        assert.equal(result.length, 2);
        assert.equal(result[0].email, 'jbloggs@example.com');
        assert.ok(result[0].subscribed);

        assert.equal(result[1].email, 'test@example.com');
        assert.equal(result[1].subscribed, false);
    });

    it('read csv: DOES NOT transforms "subscribed_to_emails" column to "subscribed" property when the WITHOUT mapping', async function () {
        const result = await readCSV({
            filePath: csvPath + 'subscribed-to-emails-header.csv'
        });

        assert.ok(result);
        assert.equal(result.length, 2);
        assert.equal(result[0].email, 'jbloggs@example.com');
        assert.ok(result[0].subscribed_to_emails);

        assert.equal(result[1].email, 'test@example.com');
        assert.equal(result[1].subscribed_to_emails, false);
    });
});
