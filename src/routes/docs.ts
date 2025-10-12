/**
 * @openapi
 * /docs/models:
 *   get:
 *     summary: View all available data schemas
 *     description: This endpoint exists solely to make all data models visible in Swagger UI.
 *     tags: [Documentation]
 *     responses:
 *       200:
 *         description: All model schemas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 User:
 *                   $ref: '#/components/schemas/User'
 *                 Church:
 *                   $ref: '#/components/schemas/Church'
 *                 District:
 *                   $ref: '#/components/schemas/District'
 *                 NationalChurch:
 *                   $ref: '#/components/schemas/NationalChurch'
 *                 Member:
 *                   $ref: '#/components/schemas/Member'
 */
export default {};
