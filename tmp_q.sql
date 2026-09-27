SET NOCOUNT ON;
SELECT name,
       CASE WHEN OBJECTPROPERTY(object_id, 'IsEncrypted') = 1 THEN 'ENC' ELSE 'OK' END AS enc,
       LEN(ISNULL(OBJECT_DEFINITION(object_id), '')) AS deflen
FROM sys.procedures
WHERE name LIKE 'Sp_Sys_GetNewID%';

SELECT OBJECT_DEFINITION(OBJECT_ID('Sp_Sys_GetNewID_BySeq_V2')) AS def;
