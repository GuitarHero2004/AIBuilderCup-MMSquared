// Generated from FastAPI OpenAPI by npm run contracts:generate. Do not edit manually.
export interface paths {
    "/api/v1/cases": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Cases */
        get: operations["list_cases_api_v1_cases_get"];
        put?: never;
        /** Create Case */
        post: operations["create_case_api_v1_cases_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Case */
        get: operations["get_case_api_v1_cases__case_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/healthz": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Health */
        get: operations["health_healthz_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /** CaseCreate */
        CaseCreate: {
            /** Name */
            name: string;
            requirement: components["schemas"]["Requirement"];
        };
        /** CaseList */
        CaseList: {
            /** Items */
            items: components["schemas"]["CaseRead"][];
        };
        /** CaseRead */
        CaseRead: {
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Data Revision
             * @default 1
             * @constant
             */
            data_revision: 1;
            default_policy?: components["schemas"]["DecisionPolicy"];
            /** Id */
            id: string;
            /**
             * Is Synthetic Demo
             * @default true
             * @constant
             */
            is_synthetic_demo: true;
            /** Name */
            name: string;
            requirement: components["schemas"]["Requirement"];
            /**
             * Schema Version
             * @default 2.0
             * @constant
             */
            schema_version: "2.0";
            /**
             * Status
             * @default draft
             * @constant
             */
            status: "draft";
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
        };
        /** CompositionPart */
        CompositionPart: {
            /** Fibre */
            fibre: string;
            /** Percentage */
            percentage: string;
        };
        /** DecisionPolicy */
        DecisionPolicy: {
            /**
             * Complete Comparable Metrics Required
             * @default true
             * @constant
             */
            complete_comparable_metrics_required: true;
            /**
             * Enforce Budget
             * @default true
             * @constant
             */
            enforce_budget: true;
            /**
             * Enforce Delivery
             * @default true
             * @constant
             */
            enforce_delivery: true;
            /**
             * Policy Version
             * @default textile_mvp_v2
             * @constant
             */
            policy_version: "textile_mvp_v2";
            /**
             * Technical Gate Required
             * @default true
             * @constant
             */
            technical_gate_required: true;
            weights?: components["schemas"]["Weights"];
        };
        /** Destination */
        Destination: {
            /**
             * Country Code
             * @constant
             */
            country_code: "VN";
            /** Label */
            label: string;
        };
        /** ErrorDetail */
        ErrorDetail: {
            /** Code */
            code: string;
            /** Message */
            message: string;
            /** Request Id */
            request_id: string;
            /** Retryable */
            retryable: boolean;
            /** Run Id */
            run_id?: null;
        };
        /** ErrorEnvelope */
        ErrorEnvelope: {
            error: components["schemas"]["ErrorDetail"];
        };
        /** Health */
        Health: {
            /**
             * Ai Enabled
             * @default false
             * @constant
             */
            ai_enabled: false;
            /**
             * Environment
             * @enum {string}
             */
            environment: "local" | "production";
            /**
             * Status
             * @default ok
             * @constant
             */
            status: "ok";
            /**
             * Storage
             * @default firestore
             * @constant
             */
            storage: "firestore";
        };
        /** Requirement */
        Requirement: {
            /**
             * Carbon Accounting Boundary
             * @constant
             */
            carbon_accounting_boundary: "wtw";
            /** Carbon Scope Id */
            carbon_scope_id: string;
            /** Cost Basis Description */
            cost_basis_description: string;
            /** Cost Basis Id */
            cost_basis_id: string;
            /**
             * Currency
             * @constant
             */
            currency: "USD";
            destination: components["schemas"]["Destination"];
            /** Maximum Budget Amount */
            maximum_budget_amount: string;
            /** Maximum Lead Time Days */
            maximum_lead_time_days: number;
            /**
             * Order Reference Date
             * Format: date
             */
            order_reference_date: string;
            /** Quantity */
            quantity: string;
            /**
             * Quantity Unit
             * @constant
             */
            quantity_unit: "metre";
            textile_specification: components["schemas"]["TextileSpecification"];
        };
        /** TextileSpecification */
        TextileSpecification: {
            /** Composition */
            composition: components["schemas"]["CompositionPart"][];
            /** Composition Tolerance Pp */
            composition_tolerance_pp: string;
            /**
             * Construction
             * @constant
             */
            construction: "woven";
            /** Gsm Tolerance Pct */
            gsm_tolerance_pct: string;
            /** Minimum Usable Width Cm */
            minimum_usable_width_cm: string;
            /** Required Colour */
            required_colour: string | null;
            /** Required Evidence */
            required_evidence: string[];
            /** Required Finish */
            required_finish: string | null;
            /** Target Gsm */
            target_gsm: string;
        };
        /** Weights */
        Weights: {
            /**
             * Carbon
             * @default 0.30
             * @constant
             */
            carbon: "0.30";
            /**
             * Cost
             * @default 0.45
             * @constant
             */
            cost: "0.45";
            /**
             * Lead Time
             * @default 0.25
             * @constant
             */
            lead_time: "0.25";
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    list_cases_api_v1_cases_get: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
                "x-firebase-appcheck"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CaseList"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    create_case_api_v1_cases_post: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
                "x-firebase-appcheck"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CaseCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CaseRead"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    get_case_api_v1_cases__case_id__get: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
                "x-firebase-appcheck"?: string | null;
            };
            path: {
                case_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CaseRead"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    health_healthz_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Health"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
}
