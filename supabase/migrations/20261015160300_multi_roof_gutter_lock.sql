-- The non-gable models are deliberately not UPDATE-visible to browser sessions.
-- The source validator must lock their rows with its owner privileges; it still
-- checks the exact organization, project, current revision and snapshot itself.
alter function private.validate_gutter_geometry_source() security definer;
alter function private.validate_gutter_geometry_source() set search_path = '';
