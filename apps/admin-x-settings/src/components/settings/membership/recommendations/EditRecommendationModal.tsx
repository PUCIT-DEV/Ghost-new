import ConfirmationModal from '../../../../admin-x-ds/global/modal/ConfirmationModal';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React from 'react';
import RecommendationDescriptionForm, {validateDescriptionForm} from './RecommendationDescriptionForm';
import useForm from '../../../../hooks/useForm';
import useHandleError from '../../../../utils/api/handleError';
import useRouting from '../../../../hooks/useRouting';
import {Recommendation, useDeleteRecommendation, useEditRecommendation} from '../../../../api/recommendations';
import {RoutingModalProps} from '../../../providers/RoutingProvider';
import {dismissAllToasts, showToast} from '../../../../admin-x-ds/global/Toast';

interface EditRecommendationModalProps {
    recommendation: Recommendation,
    animate?: boolean
}

const EditRecommendationModal: React.FC<RoutingModalProps & EditRecommendationModalProps> = ({recommendation, animate}) => {
    const modal = useModal();
    const {updateRoute} = useRouting();
    const {mutateAsync: editRecommendation} = useEditRecommendation();
    const {mutateAsync: deleteRecommendation} = useDeleteRecommendation();
    const handleError = useHandleError();

    const {formState, updateForm, handleSave, errors, clearError, setErrors, okProps} = useForm({
        initialState: {
            ...recommendation
        },
        savingDelay: 500,
        savedDelay: 500,
        onSave: async (state) => {
            await editRecommendation(state);
        },
        onSavedStateReset: () => {
            modal.remove();
            updateRoute('recommendations');
        },
        onSaveError: handleError,
        onValidate: (state) => {
            const newErrors = validateDescriptionForm(state);

            if (Object.keys(newErrors).length !== 0) {
                showToast({
                    type: 'pageError',
                    message: 'Can\'t edit recommendation, please double check that you\'ve filled all mandatory fields correctly.'
                });
            }

            return newErrors;
        }
    });

    let leftButtonProps = {
        label: 'Delete',
        link: true,
        color: 'red' as const,
        size: 'sm' as const,
        onClick: () => {
            modal.remove();
            NiceModal.show(ConfirmationModal, {
                title: 'Delete recommendation',
                prompt: <>
                    <p>Your recommendation <strong>{recommendation.title}</strong> will no longer be visible to your audience.</p>
                </>,
                okLabel: 'Delete',
                onOk: async (deleteModal) => {
                    try {
                        await deleteRecommendation(recommendation);
                        deleteModal?.remove();
                        showToast({
                            message: 'Successfully deleted the recommendation',
                            type: 'success'
                        });
                    } catch (e) {
                        showToast({
                            message: 'Failed to delete the recommendation. Please try again later.',
                            type: 'error'
                        });
                        handleError(e, {withToast: false});
                    }
                }
            });
        }
    };

    return <Modal
        afterClose={() => {
            // Closed without saving: reset route
            updateRoute('recommendations');
        }}
        animate={animate ?? true}
        backDropClick={false}
        buttonsDisabled={okProps.disabled}
        cancelLabel={'Cancel'}
        leftButtonProps={leftButtonProps}
        okColor={okProps.color}
        okLabel={okProps.label || 'Save & close'}
        size='sm'
        testId='edit-recommendation-modal'
        title={'Edit recommendation'}
        stickyFooter
        onOk={async () => {
            dismissAllToasts();
            try {
                await handleSave({force: true});
            } catch (e) {
                showToast({
                    type: 'pageError',
                    message: 'One or more fields have errors, please double check that you\'ve filled all mandatory fields.'
                });
            }
        }}
    >
        <RecommendationDescriptionForm clearError={clearError} errors={errors} formState={formState} setErrors={setErrors} showURL={true} updateForm={updateForm as any}/>
    </Modal>;
};

export default NiceModal.create(EditRecommendationModal);
