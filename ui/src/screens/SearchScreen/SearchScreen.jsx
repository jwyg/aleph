import React from 'react';
import queryString from 'query-string';
import {
  defineMessages, FormattedMessage, injectIntl,
} from 'react-intl';
import { Icon, ButtonGroup, AnchorButton, Tooltip } from '@blueprintjs/core';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import Query from 'src/app/Query';
import { selectEntitiesResult } from 'src/selectors';
import {
  Collection, DualPane, SignInCallout, ErrorSection, Breadcrumbs, ResultCount,
} from 'src/components/common';
import EntitySearch from 'src/components/EntitySearch/EntitySearch';
import SearchFacets from 'src/components/Facet/SearchFacets';
import QueryTags from 'src/components/QueryTags/QueryTags';
import SuggestAlert from 'src/components/SuggestAlert/SuggestAlert';
import Screen from 'src/components/Screen/Screen';
import togglePreview from 'src/util/togglePreview';

import './SearchScreen.scss';

const messages = defineMessages({
  no_results_title: {
    id: 'search.no_results_title',
    defaultMessage: 'No search results',
  },
  no_results_description: {
    id: 'search.no_results_description',
    defaultMessage: 'Try making your search more general',
  },
  page_title: {
    id: 'search.title',
    defaultMessage: 'Search',
  },
  alert_export_disabled: {
    id: 'search.screen.export_disabled',
    defaultMessage: 'Cannot export more than 10,000 results at a time',
  },
});

const facetKeys = [
  'collection_id', 'schema', 'countries', 'languages', 'emails', 'phones', 'names', 'addresses', 'mimetypes',
];

export class SearchScreen extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      facets: facetKeys,
      hideFacets: false,
    };

    this.updateQuery = this.updateQuery.bind(this);
    this.toggleFacets = this.toggleFacets.bind(this);
    this.getCurrentPreviewIndex = this.getCurrentPreviewIndex.bind(this);
    this.showNextPreview = this.showNextPreview.bind(this);
    this.showPreviousPreview = this.showPreviousPreview.bind(this);
    this.showPreview = this.showPreview.bind(this);
  }

  getCurrentPreviewIndex() {
    const { location } = this.props;
    const parsedHash = queryString.parse(location.hash);
    return this.props.result.results.findIndex(
      entity => entity.id === parsedHash['preview:id'],
    );
  }

  getSearchScopes() {
    const { query } = this.props;
    const activeCollections = query ? query.getFilter('collection_id') : [];

    const collectionScopeList = activeCollections.map(collectionId => (
      {
        listItem: (
          <Collection.Load id={collectionId} renderWhenLoading="...">
            {collection => (
              <Collection.Label collection={collection} icon truncate={30} />
            )}
          </Collection.Load>
        ),
        onSearch: (queryText) => {
          const newQuery = query.set('q', queryText).setFilter('collection_id', collectionId);
          this.updateQuery(newQuery);
        },
      }
    ));

    if (activeCollections.length > 1) {
      collectionScopeList.push({
        listItem: <span>{`Search ${activeCollections.length} datasets`}</span>,
        onSearch: queryText => this.updateQuery(query.set('q', queryText)),
      });
    }
    return collectionScopeList;
  }

  updateQuery(newQuery) {
    const { history, location } = this.props;
    // make it so the preview disappears if the query is changed.
    const parsedHash = queryString.parse(location.hash);
    parsedHash['preview:id'] = undefined;
    parsedHash['preview:type'] = undefined;

    history.push({
      pathname: location.pathname,
      search: newQuery.toLocation(),
      hash: queryString.stringify(parsedHash),
    });
  }

  showNextPreview(event) {
    const currentSelectionIndex = this.getCurrentPreviewIndex();
    const nextEntity = this.props.result.results[1 + currentSelectionIndex];

    if (nextEntity && currentSelectionIndex >= 0) {
      event.preventDefault();
      this.showPreview(nextEntity);
    }
  }

  showPreviousPreview(event) {
    event.preventDefault();
    const currentSelectionIndex = this.getCurrentPreviewIndex();
    const nextEntity = this.props.result.results[currentSelectionIndex - 1];
    if (nextEntity && currentSelectionIndex >= 0) {
      event.preventDefault();
      this.showPreview(nextEntity);
    }
  }

  showPreview(entity) {
    togglePreview(this.props.history, entity);
  }

  toggleFacets() {
    this.setState(({ hideFacets }) => ({ hideFacets: !hideFacets }));
  }

  render() {
    const { query, result, intl } = this.props;
    const { hideFacets } = this.state;
    const title = query.getString('q') || intl.formatMessage(messages.page_title);
    const hideFacetsClass = hideFacets ? 'show' : 'hide';
    const plusMinusIcon = hideFacets ? 'minus' : 'plus';
    const hasExportLink = result && result.links && result.links.export;
    const exportLink = !hasExportLink ? null : result.links.export;
    const tooltip = intl.formatMessage(messages.alert_export_disabled);

    const operation = (
      <ButtonGroup>
        <Tooltip content={tooltip} disabled={exportLink}>
          <AnchorButton className="bp3-intent-primary" icon="download" disabled={!exportLink} href={exportLink}>
            <FormattedMessage id="search.screen.export" defaultMessage="Export" />
          </AnchorButton>
        </Tooltip>
      </ButtonGroup>
    );
    const breadcrumbs = (
      <Breadcrumbs operation={operation}>
        <Breadcrumbs.Text icon="search">
          <FormattedMessage id="search.screen.breadcrumb" defaultMessage="Search" />
        </Breadcrumbs.Text>
        <Breadcrumbs.Text active>
          <ResultCount result={result} />
        </Breadcrumbs.Text>
      </Breadcrumbs>
    );
    const empty = (
      <ErrorSection
        icon="search"
        title={intl.formatMessage(messages.no_results_title)}
        resolver={<SuggestAlert queryText={query.state.q} />}
        description={intl.formatMessage(messages.no_results_description)}
      />
    );

    const searchScopes = this.getSearchScopes();

    return (
      <Screen
        query={query}
        title={title}
        searchScopes={searchScopes}
        hotKeys={[
          {
            combo: 'j', global: true, label: 'Preview next search entity', onKeyDown: this.showNextPreview,
          },
          {
            combo: 'k', global: true, label: 'Preview previous search entity', onKeyDown: this.showPreviousPreview,
          },
          {
            combo: 'up', global: true, label: 'Preview previous search entity', onKeyDown: this.showPreviousPreview,
          },
          {
            combo: 'down', global: true, label: 'Preview next search entity', onKeyDown: this.showNextPreview,
          },
        ]}
      >
        {breadcrumbs}
        <DualPane className="SearchScreen">
          <DualPane.SidePane>
            <div
              role="switch"
              aria-checked={!hideFacets}
              tabIndex={0}
              className="visible-sm-flex facets total-count bp3-text-muted"
              onClick={this.toggleFacets}
              onKeyPress={this.toggleFacets}
            >
              <Icon icon={plusMinusIcon} />
              <span className="total-count-span">
                <FormattedMessage id="search.screen.filters" defaultMessage="Filters" />
              </span>
            </div>
            <div className={hideFacetsClass}>
              <SearchFacets
                query={query}
                result={result}
                updateQuery={this.updateQuery}
                facets={this.state.facets}
                isCollapsible
              />
            </div>
          </DualPane.SidePane>
          <DualPane.ContentPane>
            <SignInCallout />
            <QueryTags query={query} updateQuery={this.updateQuery} />
            <EntitySearch
              query={query}
              updateQuery={this.updateQuery}
              result={result}
              emptyComponent={empty}
            />
          </DualPane.ContentPane>
        </DualPane>
      </Screen>
    );
  }
}
const mapStateToProps = (state, ownProps) => {
  const { location } = ownProps;
  // We normally only want Things, not Intervals (relations between things).
  const context = {
    highlight: true,
    'filter:schemata': 'Thing',
  };
  const query = Query.fromLocation('entities', location, context, '');
  const result = selectEntitiesResult(state, query);
  return { query, result };
};

export default compose(
  withRouter,
  connect(mapStateToProps),
  injectIntl,
)(SearchScreen);
