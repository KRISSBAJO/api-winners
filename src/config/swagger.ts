// src/config/swagger.ts
import swaggerJSDoc from "swagger-jsdoc";

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Dominion Connect API",
    version: "1.0.0",
    description:
      "Comprehensive API documentation for Dominion Connect Church Management System",
  },
  servers: [
    {
      url: "http://localhost:5000/api",
      description: "Local development server",
    },
  ],

  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter your JWT token as: Bearer <token>",
      },
    },

    /** ================= SCHEMAS ================= **/
    schemas: {
      User: {
        type: "object",
        required: ["firstName", "lastName", "email", "password", "role"],
        properties: {
          _id: { type: "string", example: "671faaa1cba123001234mnop" },
          firstName: { type: "string", example: "John" },
          middleName: { type: "string", example: "A." },
          lastName: { type: "string", example: "Doe" },
          email: { type: "string", example: "john.doe@example.com" },
          phone: { type: "string", example: "+1 615-333-9999" },
          role: {
            type: "string",
            enum: ["siteAdmin", "churchAdmin", "pastor", "volunteer"],
            example: "pastor",
          },
          churchId: {
            type: "string",
            description: "Reference to Church this user belongs to",
            example: "671f7890cba123001234ijkl",
          },
          password: { type: "string", example: "StrongPass123!" },
          isActive: { type: "boolean", example: true },
          lastLogin: { type: "string", format: "date-time" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },

      NationalChurch: {
        type: "object",
        required: ["name", "nationalPastor"],
        properties: {
          _id: { type: "string", example: "671f1234cba123001234abcd" },
          name: { type: "string", example: "Winners Chapel USA" },
          nationalPastor: { type: "string", example: "Bishop David Oyedepo Jr." },
          address: {
            type: "object",
            properties: {
              street: { type: "string", example: "123 Glory Blvd" },
              city: { type: "string", example: "Dallas" },
              state: { type: "string", example: "TX" },
              country: { type: "string", example: "USA" },
              zip: { type: "string", example: "75001" },
            },
          },
          email: { type: "string", example: "info@winnersusa.org" },
          phone: { type: "string", example: "+1 214-555-1234" },
          logoUrl: { type: "string", example: "https://cdn.domain/logo.png" },
          website: { type: "string", example: "https://winnersusa.org" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },

      District: {
        type: "object",
        required: ["name", "districtPastor", "nationalChurchId"],
        properties: {
          _id: { type: "string", example: "671f4567cba123001234efgh" },
          name: { type: "string", example: "Tennessee District" },
          districtPastor: { type: "string", example: "Pastor Samuel Adeyemi" },
          nationalChurchId: {
            type: "string",
            description: "Reference to parent national church",
            example: "671f1234cba123001234abcd",
          },
          address: {
            type: "object",
            properties: {
              street: { type: "string", example: "456 Dominion Ave" },
              city: { type: "string", example: "Nashville" },
              state: { type: "string", example: "TN" },
              country: { type: "string", example: "USA" },
              zip: { type: "string", example: "37211" },
            },
          },
          contactEmail: { type: "string", example: "tennessee@winnersusa.org" },
          contactPhone: { type: "string", example: "+1 615-555-9876" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },

        Role: {
          type: "object",
          required: ["key", "name", "permissions"],
          properties: {
            _id: { type: "string", example: "671fab12cba123001234abcd" },
            key: {
              type: "string",
              description: "Stable system key for the role",
              example: "churchAdmin",
            },
            name: {
              type: "string",
              description: "Human-readable label",
              example: "Church Admin",
            },
            permissions: {
              type: "array",
              description: "Permission keys granted to this role",
              items: { $ref: "#/components/schemas/PermissionKey" },
              example: ["event.create", "event.update", "comment.delete.any"],
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        CreateRoleInput: {
          type: "object",
          required: ["key", "name"],
          properties: {
            key: {
              type: "string",
              description: "Unique role key (e.g. siteAdmin, churchAdmin)",
              example: "districtPastor",
            },
            name: {
              type: "string",
              description: "Display name",
              example: "District Pastor",
            },
            permissions: {
              type: "array",
              items: { $ref: "#/components/schemas/PermissionKey" },
              description: "List of permission keys",
              example: ["event.create", "event.update", "user.read"],
            },
          },
        },

        UpdateRoleInput: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Display name",
              example: "District Pastor",
            },
            permissions: {
              type: "array",
              items: { $ref: "#/components/schemas/PermissionKey" },
              description: "Replace the role's permissions with this list",
              example: ["event.create", "event.update", "user.read"],
            },
          },
        },

        // Optional: include the role key enum if you want to document built-ins
        RoleKey: {
          type: "string",
          description: "Built-in role keys",
          enum: [
            "siteAdmin",
            "nationalPastor",
            "districtPastor",
            "churchAdmin",
            "pastor",
            "volunteer",
          ],
          example: "churchAdmin",
        },

        // Permission key enum used above
        PermissionKey: {
          type: "string",
          description: "Permission keys used for RBAC",
          enum: [
            // Users
            "user.read",
            "user.update",
            "user.delete",
            "user.toggleActive",

            // Events
            "event.create",
            "event.read",
            "event.update",
            "event.delete",

            // Comments
            "comment.create",
            "comment.read",
            "comment.update.own",
            "comment.delete.own",
            "comment.delete.any",

            // Volunteer Groups
            "group.create",
            "group.read",
            "group.update",
            "group.delete",

            // Roles (RBAC settings)
            "role.read",
            "role.create",
            "role.update",
            "role.delete",
          ],
          example: "event.create",
        },

        // (Nice to have) A user-with-permissions variant for auth responses
        UserWithPermissions: {
          allOf: [
            { $ref: "#/components/schemas/User" },
            {
              type: "object",
              properties: {
                permissions: {
                  type: "array",
                  items: { $ref: "#/components/schemas/PermissionKey" },
                  example: ["event.create", "event.update", "comment.delete.any"],
                },
              },
            },
          ],
        },
              Pastor: {
        type: "object",
        properties: {
          _id: { type: "string" },
          userId: { type: "string", nullable: true },
          firstName: { type: "string" },
          middleName: { type: "string", nullable: true },
          lastName: { type: "string" },
          gender: { type: "string", enum: ["Male", "Female", "Other"], nullable: true },
          phone: { type: "string", nullable: true },
          email: { type: "string", nullable: true },
          dateOfBirth: { type: "string", format: "date", nullable: true },
          dateBornAgain: { type: "string", format: "date", nullable: true },
          dateBecamePastor: { type: "string", format: "date", nullable: true },
          notes: { type: "string", nullable: true },
          currentTitle: {
            type: "string",
            enum: [
              "Resident Pastor",
              "Assistant Resident Pastor",
              "Associate Pastor",
              "Youth Pastor",
              "Pastor",
            ],
          },
          level: { type: "string", enum: ["national", "district", "church"] },
          nationalChurchId: { type: "string", nullable: true },
          districtId: { type: "string", nullable: true },
          churchId: { type: "string", nullable: true },
          isActive: { type: "boolean" },
          isDeleted: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
        required: ["firstName", "lastName", "level", "currentTitle"],
      },

      PastorCreateInput: {
        type: "object",
        required: ["firstName", "lastName", "level"],
        properties: {
          userId: { type: "string" },
          firstName: { type: "string" },
          middleName: { type: "string" },
          lastName: { type: "string" },
          gender: { $ref: "#/components/schemas/Pastor/properties/gender" },
          phone: { type: "string" },
          email: { type: "string" },
          dateOfBirth: { type: "string", format: "date" },
          dateBornAgain: { type: "string", format: "date" },
          dateBecamePastor: { type: "string", format: "date" },
          notes: { type: "string" },
          currentTitle: { $ref: "#/components/schemas/Pastor/properties/currentTitle" },
          level: { $ref: "#/components/schemas/Pastor/properties/level" },
          nationalChurchId: { type: "string" },
          districtId: { type: "string" },
          churchId: { type: "string" },
        },
      },

      PastorUpdateInput: {
        type: "object",
        description: "Update basic fields. For transfers/promotions use Assignment APIs.",
        properties: {
          userId: { type: "string" },
          firstName: { type: "string" },
          middleName: { type: "string" },
          lastName: { type: "string" },
          gender: { $ref: "#/components/schemas/Pastor/properties/gender" },
          phone: { type: "string" },
          email: { type: "string" },
          dateOfBirth: { type: "string", format: "date" },
          dateBornAgain: { type: "string", format: "date" },
          dateBecamePastor: { type: "string", format: "date" },
          notes: { type: "string" },
          currentTitle: { $ref: "#/components/schemas/Pastor/properties/currentTitle" },
          isActive: { type: "boolean" },
        },
      },

      PastorAssignment: {
        type: "object",
        properties: {
          _id: { type: "string" },
          pastorId: { type: "string" },
          level: { type: "string", enum: ["national", "district", "church"] },
          nationalChurchId: { type: "string", nullable: true },
          districtId: { type: "string", nullable: true },
          churchId: { type: "string", nullable: true },
          title: {
            type: "string",
            enum: [
              "Resident Pastor",
              "Assistant Resident Pastor",
              "Associate Pastor",
              "Youth Pastor",
              "Pastor",
            ],
          },
          startDate: { type: "string", format: "date" },
          endDate: { type: "string", format: "date", nullable: true },
          reason: { type: "string", nullable: true },
          createdBy: { type: "string", nullable: true },
          endedBy: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
        required: ["pastorId", "level", "title", "startDate"],
      },

      PastorAssignInput: {
        type: "object",
        required: ["level", "title"],
        properties: {
          level: { type: "string", enum: ["national", "district", "church"] },
          nationalChurchId: { type: "string" },
          districtId: { type: "string" },
          churchId: { type: "string" },
          title: {
            type: "string",
            enum: [
              "Resident Pastor",
              "Assistant Resident Pastor",
              "Associate Pastor",
              "Youth Pastor",
              "Pastor",
            ],
          },
          startDate: { type: "string", format: "date" },
          reason: { type: "string" },
        },
      },

          
      Church: {
        type: "object",
        required: ["name", "churchPastor", "districtId"],
        properties: {
          _id: { type: "string", example: "671f7890cba123001234ijkl" },
          name: { type: "string", example: "Winners Chapel Nashville" },
          churchPastor: { type: "string", example: "Pastor Emmanuel Ibeh" },
          districtId: {
            type: "string",
            description: "Reference to parent district",
            example: "671f4567cba123001234efgh",
          },
          address: {
            type: "object",
            properties: {
              street: { type: "string", example: "789 Faith Street" },
              city: { type: "string", example: "Nashville" },
              state: { type: "string", example: "TN" },
              country: { type: "string", example: "USA" },
              zip: { type: "string", example: "37217" },
            },
          },
          email: { type: "string", example: "nashville@winnersusa.org" },
          phone: { type: "string", example: "+1 615-555-1122" },
          capacity: { type: "number", example: 1200 },
          establishedDate: { type: "string", format: "date", example: "2012-05-10" },
          services: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", example: "Sunday Celebration Service" },
                time: { type: "string", example: "9:00 AM" },
              },
            },
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
        
      },
    },
  },
  security: [{ bearerAuth: [] }],
};

const options = {
  definition: swaggerDefinition,
  apis: ["./src/routes/*.ts"],
};

const swaggerSpec = swaggerJSDoc(options);
export default swaggerSpec;
