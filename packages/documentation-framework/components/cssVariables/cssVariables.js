import React from 'react';
import { List, ListItem, debounce } from '@patternfly/react-core';
import { Table, Thead, Th, Tr, Tbody, Td } from '@patternfly/react-table';
import { AutoLinkHeader } from '../autoLinkHeader/autoLinkHeader';
import * as tokensModule from '@patternfly/react-tokens/dist/esm/componentIndex';
import LevelUpAltIcon from '@patternfly/react-icons/dist/esm/icons/level-up-alt-icon';
import { CSSSearch } from './cssSearch';

const isColorRegex = /^(#|rgb)/;

const mappingAsList = (property, values) => (
  <List isPlain>
    <ListItem>{property}</ListItem>
    {values.map((entry) => (
      <ListItem key={entry} icon={<LevelUpAltIcon className="rotate-90-deg" />}>
        {entry}
      </ListItem>
    ))}
  </List>
);

const flattenList = (files) => {
  let list = [];
  files.forEach((file) => {
    Object.entries(file).forEach(([selector, values]) => {
      if (values !== undefined) {
        Object.entries(values).forEach(([key, val]) => {
          list.push({
            selector,
            property: val.name,
            token: key,
            value: val.value,
            values: val.values,
          });
        });
      }
    });
  });
  return list;
};

export class CSSVariables extends React.Component {
  constructor(props) {
    super(props);
    const prefixToken = props.prefix.replace('pf-v6-', '').replace(/-+/g, '_');
    const applicableFiles = Object.entries(tokensModule)
      .filter(([key, val]) => prefixToken === key)
      .sort(([key1], [key2]) => key1.localeCompare(key2))
      .map(([key, val]) => {
        if (props.selector) {
          return {
            [props.selector]: val[props.selector],
          };
        }
        return val;
      });

    this.flatList = flattenList(applicableFiles);

    this.state = {
      searchRE: '',
      rows: this.getFilteredRows(),
      allRowsExpanded: true,
    };
  }

  getFilteredRows = (searchRE) => {
    let filteredRows = [];
    let rowNumber = -1;
    this.flatList.forEach((row) => {
      const { selector, property, token, value, values } = row;
      const passes =
        !searchRE ||
        searchRE.test(selector) ||
        searchRE.test(property) ||
        searchRE.test(value) ||
        (values && searchRE.test(JSON.stringify(values)));
      if (passes) {
        const rowKey = `${selector}_${property}`;
        const isColor = isColorRegex.test(value);
        const cells = [
          ...(this.props.hideSelectorColumn ? [] : [selector]),
          property,
          <div key={rowKey}>
            <div
              key={`${rowKey}_1`}
              className="pf-v6-l-flex pf-m-space-items-sm"
            >
              {isColor && (
                <div
                  key={`${rowKey}_2`}
                  className="pf-v6-l-flex pf-m-column pf-m-align-self-center"
                >
                  <span
                    className="circle"
                    style={{ backgroundColor: `${value}` }}
                  />
                </div>
              )}
              <div
                key={`${rowKey}_3`}
                className="pf-v6-l-flex pf-m-column pf-m-align-self-center ws-td-text"
              >
                {isColor && '(In light theme)'} {value}
              </div>
            </div>
          </div>,
        ];
        filteredRows.push({
          isOpen: values ? false : undefined,
          cells,
          details: values
            ? {
                parent: rowNumber,
                fullWidth: true,
                data: mappingAsList(property, values),
              }
            : undefined,
        });
        rowNumber += 1;
        if (values) {
          rowNumber += 1;
        }
      }
    });
    return filteredRows;
  };

  onCollapse = (event, rowKey, isOpen) => {
    const { rows } = this.state;
    const collapseAll = rowKey === undefined;
    let newRows = Array.from(rows);

    if (collapseAll) {
      newRows = newRows.map((r) =>
        r.isOpen === undefined ? r : { ...r, isOpen }
      );
    } else {
      newRows[rowKey] = { ...newRows[rowKey], isOpen };
    }
    this.setState((prevState) => ({
      rows: newRows,
      ...(collapseAll && { allRowsExpanded: !prevState.allRowsExpanded }),
    }));
  };

  getDebouncedFilteredRows = debounce((value) => {
    const searchRE = new RegExp(value, 'i');
    this.setState({
      searchRE,
      rows: this.getFilteredRows(searchRE),
    });
  }, 500);

  render() {
    return (
      <React.Fragment>
        {this.props.autoLinkHeader && (
          <AutoLinkHeader
            headingLevel="h3"
            className="pf-v6-u-mt-lg pf-v6-u-mb-md"
          >{`Prefixed with '${this.props.prefix}'`}</AutoLinkHeader>
        )}
        <CSSSearch getDebouncedFilteredRows={this.getDebouncedFilteredRows} />
        <Table
          variant="compact"
          aria-label={`CSS Variables prefixed with ${this.props.prefix}`}
        >
          <Thead>
            <Tr>
              {!this.props.hideSelectorColumn && (
                <React.Fragment>
                  <Th screenReaderText="Expand or collapse column" />
                  <Th>Selector</Th>
                </React.Fragment>
              )}
              <Th>Variable</Th>
              <Th>Value</Th>
            </Tr>
          </Thead>
          {!this.props.hideSelectorColumn ? (
            this.state.rows.map((row, rowIndex) => (
              <Tbody key={rowIndex} isExpanded={row.isOpen}>
                <Tr>
                  <Td
                    expand={
                      row.details
                        ? {
                            rowIndex,
                            isExpanded: row.isOpen,
                            onToggle: this.onCollapse,
                            expandId: `css-vars-expandable-toggle-${this.props.prefix}`,
                          }
                        : undefined
                    }
                  />
                  <Td dataLabel="Selector">{row.cells[0]}</Td>
                  <Td dataLabel="Variable">{row.cells[1]}</Td>
                  <Td dataLabel="Value">{row.cells[2]}</Td>
                </Tr>
                {row.details ? (
                  <Tr isExpanded={row.isOpen}>
                    {!row.details.fullWidth ? <Td /> : null}
                    <Td dataLabel="Selector" colSpan={5}>
                      {row.details.data}
                    </Td>
                  </Tr>
                ) : null}
              </Tbody>
            ))
          ) : (
            <Tbody>
              {this.state.rows.map((row, rowIndex) => (
                <Tr key={rowIndex}>
                  <Td dataLabel="Variable">{row.cells[0]}</Td>
                  <Td dataLabel="Value">{row.cells[1]}</Td>
                </Tr>
              ))}
            </Tbody>
          )}
        </Table>
      </React.Fragment>
    );
  }
}
