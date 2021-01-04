import React from "react"
import { ListContextProvider, ListView } from "react-admin"
import useAppListController, {ListProps} from "./useAppListController"

const AppList: React.FC<ListProps> = (props) => {
    let {resource, basePath} = props;
    if (basePath === undefined) {
        basePath = `/${resource}`;
    }


    const controllerProps = useAppListController({...props, basePath});
    
    return <ListContextProvider value={controllerProps}>
        <ListView {...props as any} {...controllerProps}/>
    </ListContextProvider>
}

export default AppList;