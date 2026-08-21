class TestSubjectsCRUD:
    def test_create_subject(self, client, existing_user):
        response = client.post(
            "/api/subjects",
            json={"user_id": str(existing_user.id), "name": "Create Test Subject"},
        )
        assert response.status_code == 201, response.text
        data = response.json()
        assert data["name"] == "Create Test Subject"
        assert "id" in data

    def test_read_subject(self, client, existing_subject):
        response = client.get(f"/api/subjects/{existing_subject['id']}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == existing_subject["id"]
        assert data["name"] == "Test Subject"

    def test_read_subjects_by_user(self, client, existing_user, existing_subject):
        response = client.get("/api/subjects", params={"user_id": str(existing_user.id)})
        assert response.status_code == 200
        assert [s["id"] for s in response.json()] == [existing_subject["id"]]

    def test_update_subject(self, client, existing_subject):
        response = client.patch(
            f"/api/subjects/{existing_subject['id']}",
            json={"name": "Updated Subject Name"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == existing_subject["id"]
        assert data["name"] == "Updated Subject Name"

    def test_delete_subject(self, client, existing_subject):
        response = client.delete(f"/api/subjects/{existing_subject['id']}")
        assert response.status_code == 204

        get_response = client.get(f"/api/subjects/{existing_subject['id']}")
        assert get_response.status_code == 404

    def test_duplicate_name_for_same_user_rejected(self, client, existing_user, existing_subject):
        response = client.post(
            "/api/subjects",
            json={"user_id": str(existing_user.id), "name": existing_subject["name"]},
        )
        assert response.status_code == 400
