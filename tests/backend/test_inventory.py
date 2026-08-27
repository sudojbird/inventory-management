"""
Tests for inventory API endpoints.
"""
import pytest


class TestInventoryEndpoints:
    """Test suite for inventory-related endpoints."""

    def test_get_all_inventory(self, client):
        """Test getting all inventory items."""
        response = client.get("/api/inventory")
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0

        # Verify structure of first item
        first_item = data[0]
        assert "id" in first_item
        assert "sku" in first_item
        assert "name" in first_item
        assert "category" in first_item
        assert "warehouse" in first_item
        assert "quantity_on_hand" in first_item
        assert "reorder_point" in first_item
        assert "unit_cost" in first_item

    def test_get_inventory_by_warehouse(self, client):
        """Test filtering inventory by warehouse."""
        response = client.get("/api/inventory?warehouse=San Francisco")
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)

        # All items should be from San Francisco
        for item in data:
            assert item["warehouse"] == "San Francisco"

    def test_get_inventory_by_category(self, client):
        """Test filtering inventory by category."""
        response = client.get("/api/inventory?category=Circuit Boards")
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)

        # All items should be Circuit Boards
        for item in data:
            assert item["category"].lower() == "circuit boards"

    def test_get_inventory_by_warehouse_and_category(self, client):
        """Test filtering inventory by both warehouse and category."""
        response = client.get("/api/inventory?warehouse=London&category=Sensors")
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)

        # All items should match both filters
        for item in data:
            assert item["warehouse"] == "London"
            assert item["category"].lower() == "sensors"

    def test_get_inventory_with_all_filter(self, client):
        """Test that 'all' filter returns all items."""
        response_all = client.get("/api/inventory?warehouse=all")
        response_no_filter = client.get("/api/inventory")

        assert response_all.status_code == 200
        assert response_no_filter.status_code == 200

        # Should return same number of items
        assert len(response_all.json()) == len(response_no_filter.json())

    def test_get_inventory_item_by_id(self, client):
        """Test getting a specific inventory item by ID."""
        # First get all items to find a valid ID
        response = client.get("/api/inventory")
        all_items = response.json()
        assert len(all_items) > 0

        first_item_id = all_items[0]["id"]

        # Now get that specific item
        response = client.get(f"/api/inventory/{first_item_id}")
        assert response.status_code == 200

        item = response.json()
        assert item["id"] == first_item_id

    def test_get_nonexistent_inventory_item(self, client):
        """Test getting an inventory item that doesn't exist."""
        response = client.get("/api/inventory/nonexistent-id-999")
        assert response.status_code == 404

        data = response.json()
        assert "detail" in data
        assert "not found" in data["detail"].lower()

    def test_inventory_item_fields(self, client):
        """Test that inventory items have all required fields."""
        response = client.get("/api/inventory")
        data = response.json()

        required_fields = [
            "id", "sku", "name", "category", "warehouse",
            "quantity_on_hand", "reorder_point", "unit_cost",
            "location", "last_updated"
        ]

        for item in data:
            for field in required_fields:
                assert field in item, f"Missing field: {field}"

    def test_inventory_quantity_types(self, client):
        """Test that quantity fields are proper numeric types."""
        response = client.get("/api/inventory")
        data = response.json()

        for item in data:
            assert isinstance(item["quantity_on_hand"], int)
            assert isinstance(item["reorder_point"], int)
            assert isinstance(item["unit_cost"], (int, float))
            assert item["quantity_on_hand"] >= 0
            assert item["reorder_point"] >= 0
            assert item["unit_cost"] >= 0

    def test_get_inventory_power_supplies_category(self, client):
        """Test filtering by Power Supplies category (newly added)."""
        response = client.get("/api/inventory?category=Power Supplies")
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)

        # Should have at least one Power Supplies item
        assert len(data) > 0

        # All items should be Power Supplies
        for item in data:
            assert item["category"].lower() == "power supplies"


class TestRestockingData:
    """Tests for the inventory/forecast join the Restocking tab depends on."""

    # The 8 forecast SKUs added to inventory.json so they can be costed.
    RESTOCK_SKUS = [
        "WDG-001", "BRG-102", "GSK-203", "MTR-304",
        "FLT-405", "VLV-506", "SNR-420", "CTL-330",
    ]

    KNOWN_CATEGORIES = {
        "circuit boards", "sensors", "actuators", "controllers", "power supplies",
    }
    KNOWN_WAREHOUSES = {"San Francisco", "London", "Tokyo"}

    def test_every_demand_forecast_sku_has_inventory_row(self, client):
        """Every forecast SKU must be costable, or it silently vanishes from recommendations."""
        forecasts = client.get("/api/demand").json()
        inventory = client.get("/api/inventory").json()

        inventory_skus = {item["sku"] for item in inventory}
        forecast_skus = {f["item_sku"] for f in forecasts}

        missing = forecast_skus - inventory_skus
        assert not missing, f"forecast SKUs with no inventory row: {sorted(missing)}"

    def test_restock_skus_are_present(self, client):
        """The 8 newly added SKUs are served by the API."""
        inventory = client.get("/api/inventory").json()
        skus = {item["sku"] for item in inventory}

        for sku in self.RESTOCK_SKUS:
            assert sku in skus, f"{sku} missing from inventory"

    def test_inventory_skus_are_unique(self, client):
        """The SKU -> item join in Restocking.vue must be unambiguous."""
        skus = [item["sku"] for item in client.get("/api/inventory").json()]
        assert len(skus) == len(set(skus))

    def test_inventory_ids_are_unique(self, client):
        """Ids 33-40 must not collide - they key rows and /api/inventory/{id}."""
        ids = [item["id"] for item in client.get("/api/inventory").json()]
        assert len(ids) == len(set(ids))

    def test_restock_items_have_positive_unit_cost(self, client):
        """Budget math needs a real unit cost for every restock candidate."""
        inventory = client.get("/api/inventory").json()
        items = {i["sku"]: i for i in inventory}

        for sku in self.RESTOCK_SKUS:
            item = items[sku]
            assert item["unit_cost"] > 0, f"{sku} has no usable unit cost"
            assert item["quantity_on_hand"] >= 0

    def test_restock_items_use_filterable_category_and_warehouse(self, client):
        """A typo'd category would make an item unreachable via the FilterBar."""
        inventory = client.get("/api/inventory").json()
        items = {i["sku"]: i for i in inventory}

        for sku in self.RESTOCK_SKUS:
            item = items[sku]
            assert item["category"].lower() in self.KNOWN_CATEGORIES
            assert item["warehouse"] in self.KNOWN_WAREHOUSES

    def test_restock_items_reachable_by_their_own_filters(self, client):
        """Each new SKU is returned when filtered by its own warehouse and category."""
        inventory = client.get("/api/inventory").json()
        items = {i["sku"]: i for i in inventory}

        for sku in self.RESTOCK_SKUS:
            item = items[sku]
            response = client.get(
                "/api/inventory",
                params={"warehouse": item["warehouse"], "category": item["category"]},
            )
            assert response.status_code == 200
            assert sku in {i["sku"] for i in response.json()}

    def test_at_least_one_forecast_item_is_short(self, client):
        """The Restocking tab is pointless if nothing is ever short."""
        forecasts = client.get("/api/demand").json()
        items = {i["sku"]: i for i in client.get("/api/inventory").json()}

        shortfalls = [
            f["forecasted_demand"] - items[f["item_sku"]]["quantity_on_hand"]
            for f in forecasts
            if f["item_sku"] in items
        ]
        assert any(s > 0 for s in shortfalls)

    def test_some_forecast_item_is_adequately_stocked(self, client):
        """Guards the 'no action needed' path, including decreasing-trend items."""
        forecasts = client.get("/api/demand").json()
        items = {i["sku"]: i for i in client.get("/api/inventory").json()}

        shortfalls = [
            f["forecasted_demand"] - items[f["item_sku"]]["quantity_on_hand"]
            for f in forecasts
            if f["item_sku"] in items
        ]
        assert any(s <= 0 for s in shortfalls)
