import {isValidElement, ReactElement, useEffect, useMemo} from 'react';
import {Location} from 'history';
import {useSelector} from 'react-redux';
import get from 'lodash/get';


import {useCheckMinimumRequiredProps} from 'ra-core/esm/controller/checkMinimumRequiredProps';
import useRecordSelection from 'ra-core/esm/controller/useRecordSelection';
import useTranslate from 'ra-core/esm/i18n/useTranslate';
import useNotify from 'ra-core/esm/sideEffect/useNotify';
import useGetList from 'ra-core/esm/dataProvider/useGetList';
import {SORT_ASC} from 'ra-core/esm/reducer/admin/resource/list/queryReducer';
import defaultExporter from 'ra-core/esm/export/defaultExporter';


import {CRUD_GET_LIST, Exporter, FilterPayload, Identifier, Record, RecordMap, ReduxState, SortPayload,} from 'react-admin';
import useAppListParams from './useAppListParams';

export interface ListProps {
    // the props you can change
    filter?: FilterPayload;
    filters?: ReactElement<any>;
    filterDefaultValues?: object;
    perPage?: number;
    sort?: SortPayload;
    exporter?: Exporter | false;
    // the props managed by react-admin
    basePath?: string;
    debounce?: number;
    hasCreate?: boolean;
    hasEdit?: boolean;
    hasList?: boolean;
    hasShow?: boolean;
    location?: Location;
    path?: string;
    resource?: string;
    [key: string]: any;
}

const defaultSort = {
    field: 'id',
    order: SORT_ASC,
};

const defaultData = {};

export interface ListControllerProps<RecordType extends Record = Record> {
    basePath: string;
    currentSort: SortPayload;
    data: RecordMap<RecordType>;
    defaultTitle?: string;
    displayedFilters: any;
    error?: any;
    exporter?: Exporter | false;
    filterValues: any;
    hasCreate: boolean;
    hideFilter: (filterName: string) => void;
    ids: Identifier[];
    loading: boolean;
    loaded: boolean;
    onSelect: (ids: Identifier[]) => void;
    onToggleItem: (id: Identifier) => void;
    onUnselectItems: () => void;
    page: number;
    perPage: number;
    resource: string;
    selectedIds: Identifier[];
    setFilters: (filters: any, displayedFilters: any) => void;
    setPage: (page: number) => void;
    setPerPage: (page: number) => void;
    setSort: (sort: string, order?: string) => void;
    showFilter: (filterName: string, defaultValue: any) => void;
    total: number;
}

/**
 * Prepare data for the List view
 *
 * @param {Object} props The props passed to the List component.
 *
 * @return {Object} controllerProps Fetched and computed data for the List view
 *
 * @example
 *
 * import { useAppListController } from 'react-admin';
 * import ListView from './ListView';
 *
 * const MyList = props => {
 *     const controllerProps = useAppListController(props);
 *     return <ListView {...controllerProps} {...props} />;
 * }
 */
const useAppListController = <RecordType extends Record = Record>(
    props: ListProps
): ListControllerProps<RecordType> => {
    useCheckMinimumRequiredProps('List', ['resource'], props);


    const {
        basePath,
        exporter = defaultExporter,
        hasCreate,
        resource,
        filterDefaultValues,
        sort = defaultSort,
        perPage = 10,
        filter,
        debounce = 500,
    } = props;


    if (filter && isValidElement(filter)) {
        throw new Error(
            '<List> received a React element as `filter` props. If you intended to set the list filter elements, use the `filters` (with an s) prop instead. The `filter` prop is internal and should not be set by the developer.'
        );
    }

    const translate = useTranslate();
    const notify = useNotify();

    const [query, queryModifiers] = useAppListParams({
        resource: resource!,
        filterDefaultValues,
        sort,
        perPage,
        debounce,
    });


    const [selectedIds, selectionModifiers] = useRecordSelection(resource!);


    /**
     * We want the list of ids to be always available for optimistic rendering,
     * and therefore we need a custom action (CRUD_GET_LIST) that will be used.
     */
    const {ids, total, error, loading, loaded, data: _data} = useGetList<RecordType>(
        resource!,
        {
            page: query.page,
            perPage: query.perPage,
        },
        {field: query.sort, order: query.order},
        {...query.filter, ...filter},
        {
            action: CRUD_GET_LIST,
            onFailure: error =>
                notify(
                    typeof error === 'string'
                        ? error
                        : error.message || 'ra.notification.http_error',
                    'warning'
                ),
        }
    );

    const data = useSelector(
        (state: ReduxState): RecordMap<RecordType> => {
            return get(
                state.admin.resources,
                [resource, 'data'],
                defaultData
            ) as RecordMap<RecordType>;
        }
    );

    // When the user changes the page/sort/filter, this controller runs the
    // useGetList hook again. While the result of this new call is loading,
    // the ids and total are empty. To avoid rendering an empty list at that
    // moment, we override the ids and total with the latest loaded ones.
    const defaultIds = useSelector((state: ReduxState): Identifier[] =>
        get(state.admin.resources, [resource, 'list', 'ids'], [])
    );
    const defaultTotal = useSelector((state: ReduxState): number =>
        get(state.admin.resources, [resource, 'list', 'total'])
    );

    // Since the total can be empty during the loading phase
    // We need to override that total with the latest loaded one
    // This way, the useEffect bellow won't reset the page to 1
    const finalTotal = typeof total === 'undefined' ? defaultTotal : total;

    const finalIds = typeof total === 'undefined' ? defaultIds : ids;

    const totalPages = useMemo(() => {
        return Math.ceil(finalTotal / query.perPage) || 1;
    }, [query.perPage, finalTotal]);

    useEffect(() => {
        if (
            query.page <= 0 ||
            (!loading && query.page > 1 && (finalIds || []).length === 0)
        ) {
            // Query for a page that doesn't exist, set page to 1
            queryModifiers.setPage(1);
        } else if (!loading && query.page > totalPages) {
            // Query for a page out of bounds, set page to the last existing page
            // It occurs when deleting the last element of the last page
            queryModifiers.setPage(totalPages);
        }
    }, [
        loading,
        query.page,
        finalIds,
        queryModifiers,
        total,
        totalPages,
        defaultIds,
    ]);

    const currentSort = useMemo(
        () => ({
            field: query.sort,
            order: query.order,
        }),
        [query.sort, query.order]
    );

    const resourceName = translate(`resources.${resource}.name`, {
        smart_count: 2,
        _: resource,
    });
    const defaultTitle = translate('ra.page.list', {
        name: resourceName,
    });

    return {
        basePath: basePath!,
        currentSort,
        data,
        defaultTitle,
        displayedFilters: query.displayedFilters,
        error,
        exporter,
        filterValues: query.filterValues,
        hasCreate: hasCreate!,
        hideFilter: queryModifiers.hideFilter,
        ids: finalIds,
        loaded: loaded || defaultIds.length > 0,
        loading,
        onSelect: selectionModifiers.select,
        onToggleItem: selectionModifiers.toggle,
        onUnselectItems: selectionModifiers.clearSelection,
        page: query.page,
        perPage: query.perPage,
        resource: resource!,
        selectedIds,
        setFilters: queryModifiers.setFilters,
        setPage: queryModifiers.setPage,
        setPerPage: queryModifiers.setPerPage,
        setSort: queryModifiers.setSort,
        showFilter: queryModifiers.showFilter,
        total: finalTotal,
    };
};

export const injectedProps = [
    'basePath',
    'currentSort',
    'data',
    'defaultTitle',
    'displayedFilters',
    'error',
    'exporter',
    'filterValues',
    'hasCreate',
    'hideFilter',
    'ids',
    'loading',
    'loaded',
    'onSelect',
    'onToggleItem',
    'onUnselectItems',
    'page',
    'perPage',
    'refresh',
    'resource',
    'selectedIds',
    'setFilters',
    'setPage',
    'setPerPage',
    'setSort',
    'showFilter',
    'total',
    'totalPages',
    'version',
];

export default useAppListController;
