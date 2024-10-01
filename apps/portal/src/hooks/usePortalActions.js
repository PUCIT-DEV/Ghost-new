import {useCallback, useReducer} from 'react';

const ActionTypes = {
    SET_PAGE: 'SET_PAGE',
    SET_POPUP_NOTIFICATION: 'SET_POPUP_NOTIFICATION',
    SET_LAST_PAGE: 'SET_LAST_PAGE',
    SET_PAGE_DATA: 'SET_PAGE_DATA',
    SET_PAGE_QUERY: 'SET_PAGE_QUERY',
    SET_ACTION: 'SET_ACTION'
};

const actionReducer = (state, action) => {
    switch (action.type) {
    case ActionTypes.SET_PAGE:
        return {...state, page: action.page};
    case ActionTypes.SET_POPUP_NOTIFICATION:
        return {...state, popupNotification: action.popupNotification};
    case ActionTypes.SET_LAST_PAGE:
        return {...state, lastPage: action.lastPage};
    case ActionTypes.SET_PAGE_DATA:
        return {...state, pageData: action.pageData};
    case ActionTypes.SET_PAGE_QUERY:
        return {...state, pageQuery: action.pageQuery};
    case ActionTypes.SET_ACTION:
        return {...state, action: action.action};
    default:
        return state;
    }
};

export const usePortalActions = (initialState, api) => {
    const initialActionState = {
        page: initialState.page,
        popupNotification: initialState.popupNotification,
        lastPage: initialState.lastPage,
        pageData: initialState.pageData,
        pageQuery: initialState.pageQuery,
        action: initialState.action
    };

    const [actionState, dispatch] = useReducer(actionReducer, initialActionState);

    const dispatchAction = useCallback(async (action) => {
        switch (action.type) {
        case 'openPopup':
            dispatch({type: ActionTypes.SET_PAGE, page: action.page});
            dispatch({type: ActionTypes.SET_ACTION, action: 'openPopup'});
            break;
        case 'closePopup':
            dispatch({type: ActionTypes.SET_ACTION, action: 'closePopup'});
            break;
        case 'setPopupNotification':
            dispatch({type: ActionTypes.SET_POPUP_NOTIFICATION, popupNotification: action.popupNotification});
            break;
        case 'setLastPage':
            dispatch({type: ActionTypes.SET_LAST_PAGE, lastPage: action.lastPage});
            break;
        case 'setPageData':
            dispatch({type: ActionTypes.SET_PAGE_DATA, pageData: action.pageData});
            break;
        case 'setPageQuery':
            dispatch({type: ActionTypes.SET_PAGE_QUERY, pageQuery: action.pageQuery});
            break;
        default:
            console.error('Unknown action:', action);
        }
    }, [api]);

    return [actionState, dispatchAction];
};