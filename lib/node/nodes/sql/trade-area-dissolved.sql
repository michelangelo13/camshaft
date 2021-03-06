WITH
_cdb_analysis_source_points AS (
  {{=it.pointsQuery}}
),
_cdb_analysis_isochrones AS (
  SELECT
    cdb_dataservices_client.cdb_isochrone(
      _cdb_analysis_source_points.the_geom,
      '{{=it.kind}}'::text,
      ARRAY[{{=it.isolines}}]::integer[]
    ) as isochrone
  FROM _cdb_analysis_source_points
),
_cdb_analysis_isochrones_spread AS (
  SELECT
    (isochrone).center,
    (isochrone).data_range,
    (isochrone).the_geom
  FROM _cdb_analysis_isochrones
  ORDER BY (isochrone).data_range DESC
)
SELECT
  row_number() over() as cartodb_id,
  data_range,
  ST_Union(the_geom) the_geom
FROM
  _cdb_analysis_isochrones_spread
GROUP BY data_range
