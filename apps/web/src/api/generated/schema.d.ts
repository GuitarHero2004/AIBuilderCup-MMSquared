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
    "/api/v1/cases/{case_id}/agent-runs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Extraction */
        post: operations["extraction_api_v1_cases__case_id__agent_runs_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/comparison": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Comparison */
        get: operations["get_comparison_api_v1_cases__case_id__comparison_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/quotation-operations/{request_key}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Close Operation */
        post: operations["close_operation_api_v1_cases__case_id__quotation_operations__request_key__cancel_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/quote-intakes/{request_key}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Intake Receipt */
        get: operations["intake_receipt_api_v1_cases__case_id__quote_intakes__request_key__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/quotes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Quotes */
        get: operations["list_quotes_api_v1_cases__case_id__quotes_get"];
        put?: never;
        /** Upload Quote */
        post: operations["upload_quote_api_v1_cases__case_id__quotes_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/quotes/{quote_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Quote */
        get: operations["get_quote_api_v1_cases__case_id__quotes__quote_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/quotes/{quote_id}/confirm": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Confirm Quote */
        post: operations["confirm_quote_api_v1_cases__case_id__quotes__quote_id__confirm_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/quotes/{quote_id}/document": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Document */
        get: operations["get_document_api_v1_cases__case_id__quotes__quote_id__document_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/quotes/{quote_id}/draft": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Save Draft */
        patch: operations["save_draft_api_v1_cases__case_id__quotes__quote_id__draft_patch"];
        trace?: never;
    };
    "/api/v1/cases/{case_id}/quotes/{quote_id}/review-operations/{request_key}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Review Receipt */
        get: operations["review_receipt_api_v1_cases__case_id__quotes__quote_id__review_operations__request_key__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/quotes/{quote_id}/revisions/{revision_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Confirmed Revision */
        get: operations["confirmed_revision_api_v1_cases__case_id__quotes__quote_id__revisions__revision_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/run-operations/{request_key}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Run Receipt */
        get: operations["run_receipt_api_v1_cases__case_id__run_operations__request_key__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/runs/{run_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Run */
        get: operations["get_run_api_v1_cases__case_id__runs__run_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/runs/{run_id}/events": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Events */
        get: operations["get_events_api_v1_cases__case_id__runs__run_id__events_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/selection-operations/{request_key}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Selection Operation */
        get: operations["selection_operation_api_v1_cases__case_id__selection_operations__request_key__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/selection-operations/{request_key}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Cancel Selection Operation */
        post: operations["cancel_selection_operation_api_v1_cases__case_id__selection_operations__request_key__cancel_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/selections": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Selections */
        get: operations["list_selections_api_v1_cases__case_id__selections_get"];
        put?: never;
        /** Save Selection */
        post: operations["save_selection_api_v1_cases__case_id__selections_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cases/{case_id}/selections/{selection_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Selection */
        get: operations["get_selection_api_v1_cases__case_id__selections__selection_id__get"];
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
        /** CaseComparison */
        CaseComparison: {
            /**
             * Carbon Available
             * @default false
             * @constant
             */
            carbon_available: false;
            /** Case Data Revision */
            case_data_revision: number;
            /** Case Id */
            case_id: string;
            /**
             * Checked At
             * Format: date-time
             */
            checked_at: string;
            /** Input Fingerprint */
            input_fingerprint: string;
            /** Limitations */
            limitations: string[];
            /**
             * Ranking Available
             * @default false
             * @constant
             */
            ranking_available: false;
            requirement: components["schemas"]["Requirement"];
            /** Rows */
            rows: components["schemas"]["ComparisonRow"][];
            /**
             * Scope
             * @default confirmed_quote_checks_v1
             * @constant
             */
            scope: "confirmed_quote_checks_v1";
        };
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
             */
            data_revision: number;
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
             * @enum {string}
             */
            status: "draft" | "collecting_quotes" | "reviewing_quotes" | "ready" | "decided" | "archived";
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
        };
        /** CloseOperation */
        CloseOperation: {
            /**
             * Kind
             * @enum {string}
             */
            kind: "upload" | "save" | "confirm" | "extract";
            /** Quote Id */
            quote_id?: string | null;
        };
        /** CommercialData */
        CommercialData: {
            /** Cost Adjustments */
            cost_adjustments?: string[];
            /** Cost Basis Id */
            cost_basis_id?: string | null;
            /** Cost Basis Reviewed */
            cost_basis_reviewed?: boolean | null;
            /** Currency */
            currency?: string | null;
            /** Excluded Charges */
            excluded_charges?: string[];
            /** Included Charges */
            included_charges?: string[];
            /** Incoterm Text */
            incoterm_text?: string | null;
            /** Moq */
            moq?: string | null;
            /** Moq Unit */
            moq_unit?: ("metre" | "kg") | null;
            /** Payment Terms */
            payment_terms?: string | null;
            /** Price Unit */
            price_unit?: ("metre" | "kg") | null;
            /** Quantity Unit */
            quantity_unit?: ("metre" | "kg") | null;
            /** Quote Valid Until */
            quote_valid_until?: string | null;
            /** Quoted Quantity */
            quoted_quantity?: string | null;
            /** Unit Price Amount */
            unit_price_amount?: string | null;
        };
        /** ComparisonCheck */
        ComparisonCheck: {
            /** Code */
            code: string;
            /** Field Paths */
            field_paths?: string[];
            /** Message */
            message: string;
            /**
             * Status
             * @enum {string}
             */
            status: "pass" | "fail" | "needs_review" | "not_applicable";
        };
        /** ComparisonMetrics */
        ComparisonMetrics: {
            /** Arrival Date */
            arrival_date?: string | null;
            /** Comparable Cost Amount */
            comparable_cost_amount?: string | null;
            /** Currency */
            currency?: string | null;
            /** End To End Lead Time Days */
            end_to_end_lead_time_days?: number | null;
            /** Net Fabric Mass Kg */
            net_fabric_mass_kg?: string | null;
            /** Net Mass Basis */
            net_mass_basis?: ("actual" | "estimated") | null;
            /** Quoted Cost Amount */
            quoted_cost_amount?: string | null;
        };
        /** ComparisonRow */
        ComparisonRow: {
            /** Checks */
            checks: components["schemas"]["ComparisonCheck"][];
            /** Confirmation Revision Id */
            confirmation_revision_id: string | null;
            /** Draft Revision */
            draft_revision: number;
            metrics?: components["schemas"]["ComparisonMetrics"];
            /** Quote Id */
            quote_id: string;
            /** Source Name */
            source_name: string;
            /**
             * Status
             * @enum {string}
             */
            status: "meets_checked_requirements" | "does_not_meet_requirements" | "needs_review" | "unconfirmed";
            /** Supplier Name */
            supplier_name: string | null;
        };
        /** CompositionPart */
        CompositionPart: {
            /** Fibre */
            fibre: string;
            /** Percentage */
            percentage: string;
        };
        /** ConfirmQuote */
        ConfirmQuote: {
            /**
             * Acknowledge Review
             * @constant
             */
            acknowledge_review: true;
            /** Expected Case Revision */
            expected_case_revision: number;
            /** Expected Draft Revision */
            expected_draft_revision: number;
            /** Source Extraction Run Id */
            source_extraction_run_id: string;
        };
        /** Confirmation */
        Confirmation: {
            /**
             * Confirmed At
             * Format: date-time
             */
            confirmed_at: string;
            /** Draft Revision */
            draft_revision: number;
            /** Is Current */
            is_current: boolean;
            /** Revision Id */
            revision_id: string;
        };
        /** ConfirmedRevision */
        ConfirmedRevision: {
            /**
             * Confirmed At
             * Format: date-time
             */
            confirmed_at: string;
            /** Confirmed By Uid */
            confirmed_by_uid: string;
            /** Corrections */
            corrections: components["schemas"]["ReviewDecision"][];
            /** Draft Revision */
            draft_revision: number;
            /** Field Provenance */
            field_provenance: components["schemas"]["FieldProvenance"][];
            /** Id */
            id: string;
            /** Issues */
            issues: components["schemas"]["ReviewIssue"][];
            /** Source Extraction Run Id */
            source_extraction_run_id: string;
            /** Source File Sha256 */
            source_file_sha256: string;
            validated_data: components["schemas"]["QuoteData"];
        };
        /** DataHandling */
        DataHandling: {
            /** Processing Notice */
            processing_notice: string;
            /** Retention Notice */
            retention_notice: string;
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
            run_id?: string | null;
        };
        /** ErrorEnvelope */
        ErrorEnvelope: {
            error: components["schemas"]["ErrorDetail"];
        };
        /** ExtractionMetadata */
        ExtractionMetadata: {
            /** Candidates Token Count */
            candidates_token_count?: number | null;
            /** Model Version */
            model_version?: string | null;
            /** Prompt Token Count */
            prompt_token_count?: number | null;
            /** Thoughts Token Count */
            thoughts_token_count?: number | null;
            /** Total Token Count */
            total_token_count?: number | null;
        };
        /** ExtractionResult */
        ExtractionResult: {
            draft_data: components["schemas"]["QuoteData"];
            /** Field Provenance */
            field_provenance?: components["schemas"]["FieldProvenance"][];
            provider_metadata?: components["schemas"]["ExtractionMetadata"] | null;
            /** Warnings */
            warnings?: string[];
        };
        /** FieldProvenance */
        FieldProvenance: {
            /** Document Sha256 */
            document_sha256?: string | null;
            /** Excerpt */
            excerpt?: string | null;
            /** Field Path */
            field_path: string;
            /** Note */
            note?: string | null;
            /** Page Number */
            page_number?: number | null;
            /**
             * Review State
             * @default unreviewed
             * @enum {string}
             */
            review_state: "unreviewed" | "confirmed" | "needs_review";
            /**
             * Source Type
             * @default quotation_pdf
             * @enum {string}
             */
            source_type: "quotation_pdf" | "user_correction" | "user_entered_assumption" | "synthetic_demo" | "verified_reference";
        };
        /** Health */
        Health: {
            /**
             * Ai Enabled
             * @default false
             */
            ai_enabled: boolean;
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
        /** IntakeCapabilities */
        IntakeCapabilities: {
            /** Extraction Enabled */
            extraction_enabled: boolean;
            /** Extraction Reason */
            extraction_reason?: string | null;
            /** Upload Enabled */
            upload_enabled: boolean;
            /** Upload Reason */
            upload_reason?: string | null;
        };
        /** IntakeLimits */
        IntakeLimits: {
            /** Maximum File Bytes */
            maximum_file_bytes: number;
            /** Maximum Pdf Pages */
            maximum_pdf_pages: number;
            /** Maximum Quotes Per Case */
            maximum_quotes_per_case: number;
            /** Remaining Quote Slots */
            remaining_quote_slots: number;
        };
        /** MutationReceipt */
        MutationReceipt: {
            /** Case Data Revision */
            case_data_revision?: number | null;
            /** Draft Revision */
            draft_revision?: number | null;
            error?: components["schemas"]["RunError"] | null;
            /**
             * Kind
             * @enum {string}
             */
            kind: "upload" | "save" | "confirm";
            quote?: components["schemas"]["QuoteRead"] | null;
            /** Quote Id */
            quote_id?: string | null;
            /** Request Key */
            request_key: string;
            /**
             * Retryable
             * @default false
             */
            retryable: boolean;
            /** Revision Id */
            revision_id?: string | null;
            /**
             * State
             * @enum {string}
             */
            state: "receiving" | "saving" | "committed" | "rejected" | "interrupted";
        };
        /** OperationResolution */
        OperationResolution: {
            /**
             * Kind
             * @enum {string}
             */
            kind: "upload" | "save" | "confirm" | "extract";
            /** Message */
            message: string;
            /** Quote Id */
            quote_id?: string | null;
            /** Request Key */
            request_key: string;
            /** Run Id */
            run_id?: string | null;
            /**
             * State
             * @enum {string}
             */
            state: "cancelled" | "recorded";
        };
        /** QuoteData */
        QuoteData: {
            commercial?: components["schemas"]["CommercialData"];
            /** Evidence Claims */
            evidence_claims?: string[];
            /** Evidence Reviews */
            evidence_reviews?: string[];
            /** Supplier Name */
            supplier_name?: string | null;
            supply_chain?: components["schemas"]["SupplyChainData"];
            textile_specification?: components["schemas"]["QuoteTextileData"];
        };
        /** QuoteList */
        QuoteList: {
            capabilities: components["schemas"]["IntakeCapabilities"];
            /** Case Data Revision */
            case_data_revision: number;
            /** Case Id */
            case_id: string;
            data_handling: components["schemas"]["DataHandling"];
            /** Items */
            items: components["schemas"]["QuoteRead"][];
            limits: components["schemas"]["IntakeLimits"];
            /** Samples */
            samples?: string[];
        };
        /** QuoteRead */
        QuoteRead: {
            /** Case Data Revision */
            case_data_revision: number;
            /** Case Id */
            case_id: string;
            confirmation?: components["schemas"]["Confirmation"] | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            draft_data?: components["schemas"]["QuoteData"] | null;
            /** Draft Revision */
            draft_revision: number;
            /** Field Provenance */
            field_provenance?: components["schemas"]["FieldProvenance"][];
            /** Id */
            id: string;
            /**
             * Is Synthetic
             * @default true
             * @constant
             */
            is_synthetic: true;
            /** Issues */
            issues?: components["schemas"]["ReviewIssue"][];
            latest_run?: components["schemas"]["RunRead"] | null;
            raw_extraction?: components["schemas"]["ExtractionResult"] | null;
            /** Review Decisions */
            review_decisions?: components["schemas"]["ReviewDecision"][];
            /** Source Extraction Run Id */
            source_extraction_run_id?: string | null;
            source_file: components["schemas"]["SourceFile"];
            /**
             * Source Kind
             * @default upload
             * @constant
             */
            source_kind: "upload";
            /**
             * Status
             * @enum {string}
             */
            status: "uploaded" | "extracting" | "needs_review" | "confirmed" | "failed";
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
        };
        /** QuoteTextileData */
        QuoteTextileData: {
            /** Colour */
            colour?: string | null;
            /** Composition */
            composition?: components["schemas"]["CompositionPart"][];
            /** Construction */
            construction?: string | null;
            /** Finish */
            finish?: string | null;
            /** Gsm */
            gsm?: string | null;
            /** Recycled Content Pct */
            recycled_content_pct?: string | null;
            /** Total Width Cm */
            total_width_cm?: string | null;
            /** Usable Width Cm */
            usable_width_cm?: string | null;
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
        /** ReviewDecision */
        ReviewDecision: {
            /**
             * Basis
             * @enum {string}
             */
            basis: "extracted" | "correction" | "assumption";
            /** Field Path */
            field_path: string;
            /** Note */
            note?: string | null;
            /** Reviewed */
            reviewed: boolean;
        };
        /** ReviewIssue */
        ReviewIssue: {
            /** Blocks */
            blocks: ("technical" | "cost" | "delivery" | "carbon" | "evidence" | "ranking")[];
            /**
             * Blocks Confirmation
             * @default false
             */
            blocks_confirmation: boolean;
            /** Code */
            code: string;
            /** Field Path */
            field_path: string;
            /** Message */
            message: string;
            /**
             * Severity
             * @default blocking
             * @enum {string}
             */
            severity: "blocking" | "warning" | "info";
        };
        /** RunError */
        RunError: {
            /** Code */
            code: string;
            /** Message */
            message: string;
            /**
             * Retryable
             * @default false
             */
            retryable: boolean;
        };
        /** RunEvent */
        RunEvent: {
            /** Agent Name */
            agent_name?: null;
            /**
             * Event Type
             * @enum {string}
             */
            event_type: "run_started" | "tool_started" | "review_required" | "run_failed";
            /** Message */
            message: string;
            /** Sequence */
            sequence: number;
            /**
             * Timestamp
             * Format: date-time
             */
            timestamp: string;
            /**
             * Tool Name
             * @default extract_quote_pdf
             * @constant
             */
            tool_name: "extract_quote_pdf";
        };
        /** RunEvents */
        RunEvents: {
            /** Items */
            items: components["schemas"]["RunEvent"][];
            /** Run Id */
            run_id: string;
        };
        /** RunRead */
        RunRead: {
            /**
             * Ai Mode
             * @default live
             * @constant
             */
            ai_mode: "live";
            /** Completed At */
            completed_at?: string | null;
            error?: components["schemas"]["RunError"] | null;
            /** Expected Case Revision */
            expected_case_revision: number;
            /** Expected Draft Revision */
            expected_draft_revision: number;
            /** Id */
            id: string;
            /**
             * Model Call Count
             * @default 0
             */
            model_call_count: number;
            /** Model Id */
            model_id?: string | null;
            /** Prompt Version */
            prompt_version?: string | null;
            /** Quote Id */
            quote_id: string;
            /** Request Key */
            request_key: string;
            /** Result Case Revision */
            result_case_revision?: number | null;
            /** Result Draft Revision */
            result_draft_revision?: number | null;
            /**
             * Started At
             * Format: date-time
             */
            started_at: string;
            /**
             * Status
             * @enum {string}
             */
            status: "running" | "succeeded" | "awaiting_review" | "failed" | "cancelled" | "timed_out" | "interrupted";
        };
        /** SaveDraft */
        SaveDraft: {
            draft_data: components["schemas"]["QuoteData"];
            /** Expected Case Revision */
            expected_case_revision: number;
            /** Expected Draft Revision */
            expected_draft_revision: number;
            /** Review Decisions */
            review_decisions: components["schemas"]["ReviewDecision"][];
            /** Source Extraction Run Id */
            source_extraction_run_id: string;
        };
        /** SelectionContext */
        SelectionContext: {
            /** Case Data Revision */
            case_data_revision: number | null;
            /** Is Current */
            is_current: boolean | null;
            /** Message */
            message: string;
        };
        /** SelectionCreate */
        SelectionCreate: {
            /**
             * Acknowledge Limitations
             * @constant
             */
            acknowledge_limitations: true;
            /** Expected Case Revision */
            expected_case_revision: number;
            /** Expected Confirmed Revision Id */
            expected_confirmed_revision_id: string;
            /** Expected Input Fingerprint */
            expected_input_fingerprint: string;
            /** Selected Quote Id */
            selected_quote_id: string;
            /** Selection Reason */
            selection_reason: string;
        };
        /** SelectionList */
        SelectionList: {
            /** Case Id */
            case_id: string;
            /** Items */
            items: components["schemas"]["SelectionSummary"][];
            /**
             * Maximum Selections
             * @default 10
             * @constant
             */
            maximum_selections: 10;
            /** Remaining Selection Slots */
            remaining_selection_slots: number;
        };
        /** SelectionOperation */
        SelectionOperation: {
            /** Case Id */
            case_id: string;
            /**
             * Kind
             * @default selection_save
             * @constant
             */
            kind: "selection_save";
            /** Request Key */
            request_key: string;
            /** Selection Id */
            selection_id: string | null;
            /**
             * State
             * @enum {string}
             */
            state: "committed" | "cancelled";
        };
        /** SelectionRead */
        SelectionRead: {
            current_context: components["schemas"]["SelectionContext"];
            selection: components["schemas"]["SelectionRecord"];
        };
        /** SelectionRecord */
        SelectionRecord: {
            /** Case Data Revision */
            case_data_revision: number;
            /** Case Id */
            case_id: string;
            comparison_snapshot: components["schemas"]["CaseComparison"];
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Id */
            id: string;
            /** Input Fingerprint */
            input_fingerprint: string;
            /** Limitations */
            limitations: string[];
            /**
             * Record Type
             * @default buyer_selection_note
             * @constant
             */
            record_type: "buyer_selection_note";
            /** Selected By Uid */
            selected_by_uid: string;
            /** Selected Confirmed Revision Id */
            selected_confirmed_revision_id: string;
            /** Selected Quote Id */
            selected_quote_id: string;
            /** Selection Reason */
            selection_reason: string;
        };
        /** SelectionSummary */
        SelectionSummary: {
            /** Case Data Revision */
            case_data_revision: number;
            /** Case Id */
            case_id: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Id */
            id: string;
            /** Input Fingerprint */
            input_fingerprint: string;
            /** Selected Confirmed Revision Id */
            selected_confirmed_revision_id: string;
            /** Selected Quote Id */
            selected_quote_id: string;
            /** Selection Reason */
            selection_reason: string;
            /** Source Name */
            source_name: string;
            /** Supplier Name */
            supplier_name: string | null;
        };
        /** SourceFile */
        SourceFile: {
            /** Bytes */
            bytes: number;
            /**
             * Mime Type
             * @default application/pdf
             * @constant
             */
            mime_type: "application/pdf";
            /** Name */
            name: string;
            /** Pages */
            pages: number;
            /** Sha256 */
            sha256: string;
        };
        /** StartExtraction */
        StartExtraction: {
            /** Expected Case Revision */
            expected_case_revision: number;
            /** Expected Draft Revision */
            expected_draft_revision: number;
            /**
             * Intent
             * @constant
             */
            intent: "extract_quote";
            /** Quote Id */
            quote_id: string;
        };
        /** SupplyChainData */
        SupplyChainData: {
            /** Actual Gross Shipment Mass Kg */
            actual_gross_shipment_mass_kg?: string | null;
            /** Actual Mass Covers Order */
            actual_mass_covers_order?: boolean | null;
            /** Actual Net Fabric Mass Kg */
            actual_net_fabric_mass_kg?: string | null;
            /** Carbon Scope Id */
            carbon_scope_id?: string | null;
            /** End To End Lead Time Days */
            end_to_end_lead_time_days?: number | null;
            /** Lead Time Basis */
            lead_time_basis?: ("full_order_calendar_days_to_buyer" | "production_only" | "shipping_only" | "unknown") | null;
            /** Lead Time Basis Reviewed */
            lead_time_basis_reviewed?: boolean | null;
            /** Legs */
            legs?: components["schemas"]["TransportLeg"][];
            /** Packaging Mass Kg */
            packaging_mass_kg?: string | null;
            /** Production Lead Time Days */
            production_lead_time_days?: number | null;
            /** Route Complete */
            route_complete?: boolean | null;
            /** Shipping Lead Time Days */
            shipping_lead_time_days?: number | null;
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
        /** TransportLeg */
        TransportLeg: {
            /** Destination Label */
            destination_label?: string | null;
            /** Distance Km */
            distance_km?: string | null;
            /** Distance Source Note */
            distance_source_note?: string | null;
            /** Distance Source Type */
            distance_source_type?: ("quotation_pdf" | "synthetic_demo" | "user_entered_assumption") | null;
            /** Factor Id */
            factor_id?: null;
            /** Leg Id */
            leg_id: string;
            /** Origin Label */
            origin_label?: string | null;
            /** Transport Mode */
            transport_mode?: ("road" | "sea") | null;
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
    extraction_api_v1_cases__case_id__agent_runs_post: {
        parameters: {
            query?: never;
            header: {
                "Idempotency-Key": string;
                authorization?: string | null;
                "x-firebase-appcheck"?: string | null;
            };
            path: {
                case_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StartExtraction"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RunRead"];
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
    get_comparison_api_v1_cases__case_id__comparison_get: {
        parameters: {
            query?: {
                expected_case_revision?: number | null;
            };
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
                    "application/json": components["schemas"]["CaseComparison"];
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
    close_operation_api_v1_cases__case_id__quotation_operations__request_key__cancel_post: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
                "x-firebase-appcheck"?: string | null;
            };
            path: {
                case_id: string;
                request_key: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CloseOperation"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OperationResolution"];
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
    intake_receipt_api_v1_cases__case_id__quote_intakes__request_key__get: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
                "x-firebase-appcheck"?: string | null;
            };
            path: {
                case_id: string;
                request_key: string;
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
                    "application/json": components["schemas"]["MutationReceipt"];
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
    list_quotes_api_v1_cases__case_id__quotes_get: {
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
                    "application/json": components["schemas"]["QuoteList"];
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
    upload_quote_api_v1_cases__case_id__quotes_post: {
        parameters: {
            query?: never;
            header: {
                "Idempotency-Key": string;
                authorization?: string | null;
                "x-firebase-appcheck"?: string | null;
            };
            path: {
                case_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    expected_case_revision: number;
                    /** Format: binary */
                    file: string;
                    /** @constant */
                    is_synthetic: true;
                };
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MutationReceipt"];
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
    get_quote_api_v1_cases__case_id__quotes__quote_id__get: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
                "x-firebase-appcheck"?: string | null;
            };
            path: {
                case_id: string;
                quote_id: string;
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
                    "application/json": components["schemas"]["QuoteRead"];
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
    confirm_quote_api_v1_cases__case_id__quotes__quote_id__confirm_post: {
        parameters: {
            query?: never;
            header: {
                "Idempotency-Key": string;
                authorization?: string | null;
                "x-firebase-appcheck"?: string | null;
            };
            path: {
                case_id: string;
                quote_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ConfirmQuote"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MutationReceipt"];
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
    get_document_api_v1_cases__case_id__quotes__quote_id__document_get: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
                "x-firebase-appcheck"?: string | null;
            };
            path: {
                case_id: string;
                quote_id: string;
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
                    "application/pdf": unknown;
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
    save_draft_api_v1_cases__case_id__quotes__quote_id__draft_patch: {
        parameters: {
            query?: never;
            header: {
                "Idempotency-Key": string;
                authorization?: string | null;
                "x-firebase-appcheck"?: string | null;
            };
            path: {
                case_id: string;
                quote_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SaveDraft"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MutationReceipt"];
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
    review_receipt_api_v1_cases__case_id__quotes__quote_id__review_operations__request_key__get: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
                "x-firebase-appcheck"?: string | null;
            };
            path: {
                case_id: string;
                quote_id: string;
                request_key: string;
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
                    "application/json": components["schemas"]["MutationReceipt"];
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
    confirmed_revision_api_v1_cases__case_id__quotes__quote_id__revisions__revision_id__get: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
                "x-firebase-appcheck"?: string | null;
            };
            path: {
                case_id: string;
                quote_id: string;
                revision_id: string;
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
                    "application/json": components["schemas"]["ConfirmedRevision"];
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
    run_receipt_api_v1_cases__case_id__run_operations__request_key__get: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
                "x-firebase-appcheck"?: string | null;
            };
            path: {
                case_id: string;
                request_key: string;
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
                    "application/json": components["schemas"]["RunRead"];
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
    get_run_api_v1_cases__case_id__runs__run_id__get: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
                "x-firebase-appcheck"?: string | null;
            };
            path: {
                case_id: string;
                run_id: string;
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
                    "application/json": components["schemas"]["RunRead"];
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
    get_events_api_v1_cases__case_id__runs__run_id__events_get: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
                "x-firebase-appcheck"?: string | null;
            };
            path: {
                case_id: string;
                run_id: string;
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
                    "application/json": components["schemas"]["RunEvents"];
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
    selection_operation_api_v1_cases__case_id__selection_operations__request_key__get: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
                "x-firebase-appcheck"?: string | null;
            };
            path: {
                case_id: string;
                request_key: string;
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
                    "application/json": components["schemas"]["SelectionOperation"];
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
            /** @description Saved inputs changed or request reference conflicts */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
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
    cancel_selection_operation_api_v1_cases__case_id__selection_operations__request_key__cancel_post: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
                "x-firebase-appcheck"?: string | null;
            };
            path: {
                case_id: string;
                request_key: string;
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
                    "application/json": components["schemas"]["SelectionOperation"];
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
            /** @description Saved inputs changed or request reference conflicts */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
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
    list_selections_api_v1_cases__case_id__selections_get: {
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
                    "application/json": components["schemas"]["SelectionList"];
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
            /** @description Saved inputs changed or request reference conflicts */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
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
    save_selection_api_v1_cases__case_id__selections_post: {
        parameters: {
            query?: never;
            header: {
                "Idempotency-Key": string;
                authorization?: string | null;
                "x-firebase-appcheck"?: string | null;
            };
            path: {
                case_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SelectionCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SelectionOperation"];
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
            /** @description Saved inputs changed or request reference conflicts */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
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
    get_selection_api_v1_cases__case_id__selections__selection_id__get: {
        parameters: {
            query?: never;
            header?: {
                authorization?: string | null;
                "x-firebase-appcheck"?: string | null;
            };
            path: {
                case_id: string;
                selection_id: string;
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
                    "application/json": components["schemas"]["SelectionRead"];
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
            /** @description Saved inputs changed or request reference conflicts */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
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
