import * as React from "react";
import {useFormState} from 'react-final-form';
import {
    Admin,
    Datagrid,
    Edit,
    ListGuesser,
    ReferenceField,
    GetManyReferenceParams,
    ReferenceInput,
    AutocompleteInput,
    Resource,
    SimpleForm,
    TextField,
    TextInput,
    EditGuesser,
    ShowGuesser,
    useQuery,
    SimpleShowLayout,
    Show,
    AutocompleteArrayInput,
    Filter,
} from 'react-admin';
import {makeStyles} from '@material-ui/core'
import AppList from './AppList'
import dp from './dataprovider'


interface DependentAutocompleteProps {
    foreignKey: string;
    foreignLookupField: string;
    foreignResource: string
    source: string
}

const DependentAutocomplete = (props: DependentAutocompleteProps) => {
    const {foreignKey, foreignResource, foreignLookupField} = props;
    const {values: {[foreignKey]: fkValue}} = useFormState();

    // console.log({ foreignKey, foreignResource, foreignField: foreignLookupField, fkValue });

    const {loaded, error, data} = useQuery({
        type: 'getManyReference',
        resource: foreignResource,
        payload: ({
            id: fkValue,
            target: foreignLookupField,
            pagination: {page: 1, perPage: 10},
            filter: {},
            sort: {field: 'id', order: 'ASC'}
        } as GetManyReferenceParams)
    });

    if (loaded) {
        return <AutocompleteInput {...props} optionText='title' choices={data}/>
    }
    return <div>Loading...</div>
}

const DependentReferenceInput = (props: any) => {
    const {dependsOn, lookupField, hideEmpty, ...rest} = props;
    const {values: {[dependsOn]: fkValue}} = useFormState();

    console.log({fkValue});


    if (hideEmpty && fkValue === undefined || fkValue == null) {
        return null;
    }

    return <ReferenceInput
        filter={{[lookupField]: fkValue}}
        {...rest}
    >{props.children}</ReferenceInput>
}

export const PostEdit = (props: any) => {
    return (
        <Edit {...props} undoable={false}>
            <SimpleForm>
                <TextInput source='title'/>
                <ReferenceInput reference='category' source={'categoryId'} filter={{parentId: undefined}} allowEmpty>
                    <AutocompleteInput optionText='title'/>
                </ReferenceInput>
                <DependentReferenceInput reference='category' source={'subCategoryId'} dependsOn='categoryId'
                                         lookupField='parentId' hideEmpty allowEmpty>
                    <AutocompleteArrayInput optionText='title'/>
                </DependentReferenceInput>
            </SimpleForm>
        </Edit>
    );
};

export const PostShow = (props: any) => (
    <Show {...props}>
        <SimpleShowLayout>
            <TextField source="id"/>
            <TextField source="title"/>
            <ReferenceField source="categoryId" reference="category">
                <TextField source="text"/>
            </ReferenceField>
            <ReferenceField source="subCategoryId" reference="category">
                <TextField source="text"/>
            </ReferenceField>
            <ReferenceField source="subSubCategoryId" reference="category">
                <TextField source="text"/>
            </ReferenceField>
        </SimpleShowLayout>
    </Show>
);

const useDashboardStyles = makeStyles(theme => ({
    title: {
        ...theme.typography.h6,
        fontWeight: theme.typography.fontWeightBold,
    },
}));

const MultipleDatagrid = (props: any) => {
    const theme = useDashboardStyles();
    return (
        <>
            <h2 className={theme.title}>Users - List 1</h2>
            <AppList resource='users'
                     filters={
                         <Filter {...props}>
                             <TextInput label="Search" source="q" alwaysOn/>
                         </Filter>
                     }>

                <Datagrid rowClick={'show'}>
                    <TextField source='name'/>
                </Datagrid>

            </AppList>

            <h2 className={theme.title}>Users - List 2</h2>
            <AppList resource='users'
                     filters={
                         <Filter {...props}>
                             <TextInput label="Search" source="q" alwaysOn/>
                         </Filter>
                     }>

                <Datagrid rowClick={'show'}>
                    <TextField source='name'/>
                </Datagrid>

            </AppList>

            <h2 className={theme.title}>Posts</h2>
            <AppList resource='posts'
                     filters={
                         <Filter>
                             <TextInput label="Title" source="q" alwaysOn/>
                         </Filter>
                     }>

                <Datagrid rowClick={'show'}>
                    <TextField source='title'/>
                </Datagrid>

            </AppList>
        </>
    )
}


const App = () => (
    <Admin dataProvider={dp} dashboard={MultipleDatagrid}>
        <Resource name="users" list={ListGuesser} edit={EditGuesser} show={ShowGuesser}/>
        <Resource name="posts" list={ListGuesser} edit={PostEdit} show={ShowGuesser}/>
    </Admin>
);

export default App;
