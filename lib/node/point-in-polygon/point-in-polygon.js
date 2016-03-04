'use strict';

var async = require('async');
var dot = require('dot');
dot.templateSettings.strip = false;

var id = require('../../util/id');

var queryTemplate = dot.template([
    'WITH',
    '_cdb_analysis_points AS (',
    ' {{=it.pointsQuery}}',
    '),',
    '_cdb_analysis_polygons AS (',
    ' {{=it.polygonsQuery}}',
    ')',
    'SELECT {{=it.pointsColumns}}',
    'FROM _cdb_analysis_points JOIN _cdb_analysis_polygons',
    'ON ST_Contains(_cdb_analysis_polygons.the_geom, _cdb_analysis_points.the_geom)'
].join('\n'));

function query(it) {
    it.pointsColumns = it.columnNames.map(function(name) { return '_cdb_analysis_points.' + name; }).join(', ');
    return queryTemplate(it);
}

var TYPE = 'point-in-polygon';

function PointInPolygon(pointsNode, polygonsNode, columns, params) {
    this.pointsNode = pointsNode;
    this.polygonsNode = polygonsNode;

    this.columns = columns;

    this.params = params || {};
}

module.exports = PointInPolygon;
module.exports.TYPE = TYPE;
module.exports.create = function(definition, factory, databaseService, callback) {
    var sources = [definition.params.pointsSource, definition.params.polygonsSource];
    async.map(sources, factory.create.bind(factory), function(err, results) {
        if (err) {
            return callback(err);
        }

        var pointsNode = results[0];
        var polygonsNode = results[1];


        databaseService.getColumnNames(pointsNode.getQuery(), function(err, columnNames) {
            if (err) {
                return callback(err);
            }

            columnNames = columnNames
                .filter(function(columnName) {
                    return columnName !== 'the_geom_webmercator';
                });

            return callback(null, new PointInPolygon(pointsNode, polygonsNode, columnNames, definition.params));
        });

    });
};



// ------------------------------ PUBLIC API ------------------------------ //

PointInPolygon.prototype.id = function() {
    return id(this.toJSON());
};

PointInPolygon.prototype.getQuery = function() {
    return query({
        pointsQuery: this.pointsNode.getQuery(),
        polygonsQuery: this.polygonsNode.getQuery(),
        columnNames: this.columns
    });
};


PointInPolygon.prototype.getColumns = function() {
    return this.columns;
};

PointInPolygon.prototype.setColumns = function(columns) {
    this.columns = columns;
};

PointInPolygon.prototype.getInputNodes = function() {
    return [this.pointsNode, this.polygonsNode];
};

PointInPolygon.prototype.getCacheTables = function() {
    return [];
};

PointInPolygon.prototype.getAffectedTables = function() {
    return [];
};

PointInPolygon.prototype.toJSON = function() {
    return {
        type: TYPE,
        pointsNodeId: this.pointsNode.id(),
        polygonsNodeNodeId: this.polygonsNode.id()
    };
};

PointInPolygon.prototype.toDot = function() {
    return {
        type: TYPE,
        color: 'red',
        nodes: {
            pointsNode: this.pointsNode,
            polygonsNodeNode: this.polygonsNode
        },
        attrs: {}
    };
};

// ---------------------------- END PUBLIC API ---------------------------- //

PointInPolygon.prototype.getTargetTable = function() {
    return 'analysis_point_in_polygon_' + this.id();
};